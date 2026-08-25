create extension if not exists "pgcrypto";

create type public.app_role as enum ('participant', 'admin', 'super_admin');
create type public.exam_status as enum ('draft', 'published', 'archived');
create type public.attempt_status as enum ('in_progress', 'submitted', 'expired');
create type public.scoring_mode as enum ('correctness', 'option_value');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null default '', role public.app_role not null default 'participant',
  avatar_path text, phone text, institution text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.exams (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  description text, instructions text, duration_minutes integer not null check(duration_minutes > 0),
  start_at timestamptz, end_at timestamptz, status public.exam_status not null default 'draft',
  shuffle_questions boolean not null default false, shuffle_options boolean not null default false,
  security_policy jsonb not null default '{"require_fullscreen":true,"disable_clipboard":true,"log_focus_loss":true,"log_connectivity":true,"warn_after_violations":1,"auto_submit_after_violations":0}'::jsonb,
  result_release_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.exam_sections (id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade, title text not null, instructions text, position integer not null default 0, created_at timestamptz not null default now());
create table public.questions (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade, section_id uuid references public.exam_sections(id) on delete set null,
  position integer not null default 0, stem text not null, media_path text, scoring_mode public.scoring_mode not null default 'correctness',
  correct_score numeric not null default 4, incorrect_score numeric not null default -1, blank_score numeric not null default 0,
  explanation text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.question_options (id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id) on delete cascade, label text not null, content text not null, position integer not null, is_correct boolean not null default false, score_value numeric, unique(question_id, position));
create table public.exam_assignments (id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, assigned_at timestamptz not null default now(), attempt_limit integer not null default 1 check(attempt_limit > 0), extra_time_minutes integer not null default 0, status text not null default 'active' check(status in ('active','revoked')), unique(exam_id,user_id));
create table public.attempts (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id), user_id uuid not null references public.profiles(id), assignment_id uuid references public.exam_assignments(id),
  status public.attempt_status not null default 'in_progress', started_at timestamptz not null default now(), deadline_at timestamptz not null, submitted_at timestamptz, last_seen_at timestamptz not null default now(), score numeric, max_score numeric, violation_count integer not null default 0, security_status text not null default 'clear', created_at timestamptz not null default now(), unique(exam_id,user_id,status) deferrable initially immediate
);
create table public.attempt_question_snapshots (attempt_id uuid not null references public.attempts(id) on delete cascade, question_id uuid not null, position integer not null, stem text not null, scoring_mode public.scoring_mode not null, correct_score numeric not null, incorrect_score numeric not null, blank_score numeric not null, options jsonb not null, primary key(attempt_id,question_id));
create table public.attempt_answers (attempt_id uuid not null references public.attempts(id) on delete cascade, question_id uuid not null, selected_option_id uuid, client_updated_at timestamptz, server_updated_at timestamptz not null default now(), primary key(attempt_id,question_id));
create table public.attempt_events (id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.attempts(id) on delete cascade, event_type text not null, occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb);
create table public.email_outbox (id uuid primary key default gen_random_uuid(), recipient text not null, template text not null, payload jsonb not null default '{}'::jsonb, status text not null default 'pending', attempts integer not null default 0, last_error text, sent_at timestamptz, created_at timestamptz not null default now());

create index attempts_user_exam_idx on public.attempts(user_id, exam_id); create index answers_attempt_idx on public.attempt_answers(attempt_id); create index events_attempt_time_idx on public.attempt_events(attempt_id, occurred_at desc); create index assignments_user_exam_idx on public.exam_assignments(user_id, exam_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger exams_updated before update on public.exams for each row execute function public.set_updated_at();
create trigger questions_updated before update on public.questions for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','super_admin')); $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,full_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,'')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security; alter table public.exams enable row level security; alter table public.exam_sections enable row level security; alter table public.questions enable row level security; alter table public.question_options enable row level security; alter table public.exam_assignments enable row level security; alter table public.attempts enable row level security; alter table public.attempt_question_snapshots enable row level security; alter table public.attempt_answers enable row level security; alter table public.attempt_events enable row level security;
create policy "profile own or admin" on public.profiles for select using (id=auth.uid() or public.is_admin()); create policy "profile update own" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "admin exams" on public.exams for all using(public.is_admin()) with check(public.is_admin()); create policy "assigned published exam" on public.exams for select using(status='published' and exists(select 1 from public.exam_assignments a where a.exam_id=id and a.user_id=auth.uid() and a.status='active'));
create policy "admin sections" on public.exam_sections for all using(public.is_admin()) with check(public.is_admin()); create policy "participant sections" on public.exam_sections for select using(exists(select 1 from public.exams e join public.exam_assignments a on a.exam_id=e.id where e.id=exam_id and e.status='published' and a.user_id=auth.uid()));
create policy "admin questions" on public.questions for all using(public.is_admin()) with check(public.is_admin()); create policy "admin options" on public.question_options for all using(public.is_admin()) with check(public.is_admin());
create policy "assignment own or admin" on public.exam_assignments for select using(user_id=auth.uid() or public.is_admin()); create policy "admin assignments" on public.exam_assignments for all using(public.is_admin()) with check(public.is_admin());
create policy "attempt own or admin" on public.attempts for select using(user_id=auth.uid() or public.is_admin()); create policy "answer own or admin" on public.attempt_answers for select using(exists(select 1 from public.attempts where id=attempt_id and user_id=auth.uid()) or public.is_admin()); create policy "events own or admin" on public.attempt_events for select using(exists(select 1 from public.attempts where id=attempt_id and user_id=auth.uid()) or public.is_admin()); create policy "snapshots own or admin" on public.attempt_question_snapshots for select using(exists(select 1 from public.attempts where id=attempt_id and user_id=auth.uid()) or public.is_admin());

create or replace function public.start_or_resume_attempt(p_exam_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_assignment public.exam_assignments; v_exam public.exams; v_attempt uuid; begin
 select * into v_assignment from public.exam_assignments where exam_id=p_exam_id and user_id=auth.uid() and status='active'; if not found then raise exception 'Tidak memiliki akses ujian'; end if;
 select * into v_exam from public.exams where id=p_exam_id and status='published'; if not found or (v_exam.start_at is not null and now()<v_exam.start_at) or (v_exam.end_at is not null and now()>v_exam.end_at) then raise exception 'Ujian belum tersedia'; end if;
 select id into v_attempt from public.attempts where exam_id=p_exam_id and user_id=auth.uid() and status='in_progress' limit 1; if found then update public.attempts set last_seen_at=now() where id=v_attempt; return v_attempt; end if;
 insert into public.attempts(exam_id,user_id,assignment_id,deadline_at) values(p_exam_id,auth.uid(),v_assignment.id,now()+make_interval(mins=>v_exam.duration_minutes+v_assignment.extra_time_minutes)) returning id into v_attempt;
 insert into public.attempt_question_snapshots(attempt_id,question_id,position,stem,scoring_mode,correct_score,incorrect_score,blank_score,options)
 select v_attempt,q.id,row_number() over(order by case when v_exam.shuffle_questions then random() else q.position end),q.stem,q.scoring_mode,q.correct_score,q.incorrect_score,q.blank_score,(select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'content',o.content,'is_correct',o.is_correct,'score_value',o.score_value) order by case when v_exam.shuffle_options then random() else o.position end) from public.question_options o where o.question_id=q.id) from public.questions q where q.exam_id=p_exam_id and q.is_active;
 return v_attempt; end; $$;

create or replace function public.submit_attempt(p_attempt_id uuid) returns numeric language plpgsql security definer set search_path=public as $$
declare v_score numeric:=0; begin
 if not exists(select 1 from public.attempts where id=p_attempt_id and user_id=auth.uid() and status='in_progress') then return (select score from public.attempts where id=p_attempt_id and user_id=auth.uid()); end if;
 select coalesce(sum(case when a.selected_option_id is null then s.blank_score when s.scoring_mode='correctness' and exists(select 1 from jsonb_array_elements(s.options) x where (x->>'id')::uuid=a.selected_option_id and (x->>'is_correct')::boolean) then s.correct_score when s.scoring_mode='correctness' then s.incorrect_score else coalesce((select (x->>'score_value')::numeric from jsonb_array_elements(s.options) x where (x->>'id')::uuid=a.selected_option_id),s.blank_score) end),0) into v_score from public.attempt_question_snapshots s left join public.attempt_answers a on a.attempt_id=s.attempt_id and a.question_id=s.question_id where s.attempt_id=p_attempt_id;
 update public.attempts set status='submitted',submitted_at=now(),score=v_score where id=p_attempt_id; return v_score; end; $$;
grant execute on function public.start_or_resume_attempt(uuid) to authenticated; grant execute on function public.submit_attempt(uuid) to authenticated;

create or replace function public.get_attempt_runner(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare output jsonb; begin
 select jsonb_build_object('id',a.id,'exam_id',a.exam_id,'status',a.status,'deadline_at',a.deadline_at,'security_policy',e.security_policy,'title',e.title,'questions',coalesce((select jsonb_agg(jsonb_build_object('id',s.question_id,'position',s.position,'stem',s.stem,'options',(select jsonb_agg(jsonb_build_object('id',x->>'id','label',x->>'label','content',x->>'content')) from jsonb_array_elements(s.options) x),'selected_option_id',aa.selected_option_id) order by s.position) from public.attempt_question_snapshots s left join public.attempt_answers aa on aa.attempt_id=s.attempt_id and aa.question_id=s.question_id where s.attempt_id=a.id),'[]'::jsonb)) into output from public.attempts a join public.exams e on e.id=a.exam_id where a.id=p_attempt_id and a.user_id=auth.uid();
 if output is null then raise exception 'Attempt tidak ditemukan'; end if; return output; end; $$;
create or replace function public.save_attempt_answers(p_attempt_id uuid, p_answers jsonb) returns void language plpgsql security definer set search_path=public as $$
declare answer jsonb; begin
 if not exists(select 1 from public.attempts where id=p_attempt_id and user_id=auth.uid() and status='in_progress' and deadline_at>now()) then raise exception 'Attempt sudah selesai atau waktu habis'; end if;
 for answer in select * from jsonb_array_elements(p_answers) loop
   if not exists(select 1 from public.attempt_question_snapshots s where s.attempt_id=p_attempt_id and s.question_id=(answer->>'question_id')::uuid and ((answer->>'selected_option_id') is null or exists(select 1 from jsonb_array_elements(s.options) x where x->>'id'=answer->>'selected_option_id'))) then raise exception 'Jawaban tidak valid'; end if;
   insert into public.attempt_answers(attempt_id,question_id,selected_option_id,client_updated_at) values(p_attempt_id,(answer->>'question_id')::uuid,nullif(answer->>'selected_option_id','')::uuid,nullif(answer->>'client_updated_at','')::timestamptz) on conflict(attempt_id,question_id) do update set selected_option_id=excluded.selected_option_id,client_updated_at=excluded.client_updated_at,server_updated_at=now();
 end loop; update public.attempts set last_seen_at=now() where id=p_attempt_id; end; $$;
create or replace function public.log_attempt_event(p_attempt_id uuid,p_event_type text,p_metadata jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from public.attempts where id=p_attempt_id and user_id=auth.uid()) then raise exception 'Attempt tidak ditemukan'; end if; insert into public.attempt_events(attempt_id,event_type,metadata) values(p_attempt_id,left(p_event_type,80),p_metadata); if p_event_type in ('tab_hidden','window_blur','fullscreen_exit','clipboard_attempt') then update public.attempts set violation_count=violation_count+1 where id=p_attempt_id; end if; end; $$;
grant execute on function public.get_attempt_runner(uuid) to authenticated; grant execute on function public.save_attempt_answers(uuid,jsonb) to authenticated; grant execute on function public.log_attempt_event(uuid,text,jsonb) to authenticated;
