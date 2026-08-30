-- =========================================================================
-- TRY OUT YUK — COMPLETE SQL MIGRATION & SEED SCRIPT (ONE-CLICK EXECUTION)
-- Salin seluruh isi script ini dan klik RUN di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kkmylhyvmfpmprzghmix/sql
-- =========================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('participant', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.exam_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'submitted', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.scoring_mode AS ENUM ('correctness', 'option_value');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLES CREATION
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'participant',
  avatar_path text,
  phone text,
  institution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  instructions text,
  duration_minutes integer NOT NULL CHECK(duration_minutes > 0),
  start_at timestamptz,
  end_at timestamptz,
  status public.exam_status NOT NULL DEFAULT 'draft',
  shuffle_questions boolean NOT NULL DEFAULT false,
  shuffle_options boolean NOT NULL DEFAULT false,
  security_policy jsonb NOT NULL DEFAULT '{"require_fullscreen":true,"disable_clipboard":true,"log_focus_loss":true,"log_connectivity":true,"warn_after_violations":2,"auto_submit_after_violations":5}'::jsonb,
  result_release_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.exam_sections(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  stem text NOT NULL,
  media_path text,
  scoring_mode public.scoring_mode NOT NULL DEFAULT 'correctness',
  correct_score numeric NOT NULL DEFAULT 5,
  incorrect_score numeric NOT NULL DEFAULT 0,
  blank_score numeric NOT NULL DEFAULT 0,
  explanation text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  content text NOT NULL,
  position integer NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  score_value numeric,
  UNIQUE(question_id, position)
);

CREATE TABLE IF NOT EXISTS public.exam_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  attempt_limit integer NOT NULL DEFAULT 1 CHECK(attempt_limit > 0),
  extra_time_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK(status in ('active','revoked')),
  UNIQUE(exam_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  assignment_id uuid REFERENCES public.exam_assignments(id),
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz NOT NULL,
  submitted_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  score numeric,
  max_score numeric,
  violation_count integer NOT NULL DEFAULT 0,
  security_status text NOT NULL DEFAULT 'clear',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_id, user_id, status) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE IF NOT EXISTS public.attempt_question_snapshots (
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  position integer NOT NULL,
  stem text NOT NULL,
  scoring_mode public.scoring_mode NOT NULL,
  correct_score numeric NOT NULL,
  incorrect_score numeric NOT NULL,
  blank_score numeric NOT NULL,
  options jsonb NOT NULL,
  PRIMARY KEY(attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.attempt_answers (
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  selected_option_id uuid,
  client_updated_at timestamptz,
  server_updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.attempt_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'announcement',
  target_role text DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements view all" ON public.announcements;
CREATE POLICY "announcements view all" ON public.announcements
FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "announcements admin manage" ON public.announcements;
CREATE POLICY "announcements admin manage" ON public.announcements
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- 3. TRIGGERS & FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS exams_updated ON public.exams;
CREATE TRIGGER exams_updated BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS questions_updated ON public.questions;
CREATE TRIGGER questions_updated BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT exists(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.email, ''),
    CASE WHEN new.email = 'rangkiangweb@gmail.com' THEN 'super_admin'::public.app_role ELSE 'participant'::public.app_role END
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_question_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profile select" ON public.profiles;
CREATE POLICY "profile select" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profile update" ON public.profiles;
CREATE POLICY "profile update" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- Exams Policies
DROP POLICY IF EXISTS "admin exams" ON public.exams;
CREATE POLICY "admin exams" ON public.exams FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "participant published exams" ON public.exams;
CREATE POLICY "participant published exams" ON public.exams FOR SELECT USING (status = 'published');

-- Exam Sections Policies
DROP POLICY IF EXISTS "admin sections" ON public.exam_sections;
CREATE POLICY "admin sections" ON public.exam_sections FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "participant sections" ON public.exam_sections;
CREATE POLICY "participant sections" ON public.exam_sections FOR SELECT USING (true);

-- Questions Policies
DROP POLICY IF EXISTS "admin questions" ON public.questions;
CREATE POLICY "admin questions" ON public.questions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "participant questions" ON public.questions;
CREATE POLICY "participant questions" ON public.questions FOR SELECT USING (true);

-- Question Options Policies
DROP POLICY IF EXISTS "admin options" ON public.question_options;
CREATE POLICY "admin options" ON public.question_options FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "participant options" ON public.question_options;
CREATE POLICY "participant options" ON public.question_options FOR SELECT USING (true);

-- Assignments Policies
DROP POLICY IF EXISTS "assignment access" ON public.exam_assignments;
CREATE POLICY "assignment access" ON public.exam_assignments FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admin assignments" ON public.exam_assignments;
CREATE POLICY "admin assignments" ON public.exam_assignments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Attempts Policies
DROP POLICY IF EXISTS "attempts access" ON public.attempts;
CREATE POLICY "attempts access" ON public.attempts FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "attempts insert" ON public.attempts;
CREATE POLICY "attempts insert" ON public.attempts FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "attempts update" ON public.attempts;
CREATE POLICY "attempts update" ON public.attempts FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "attempts delete" ON public.attempts;
CREATE POLICY "attempts delete" ON public.attempts FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- Answers, Events & Snapshots
DROP POLICY IF EXISTS "answers access" ON public.attempt_answers;
CREATE POLICY "answers access" ON public.attempt_answers FOR ALL USING (true);

DROP POLICY IF EXISTS "events access" ON public.attempt_events;
CREATE POLICY "events access" ON public.attempt_events FOR ALL USING (true);

DROP POLICY IF EXISTS "snapshots access" ON public.attempt_question_snapshots;
CREATE POLICY "snapshots access" ON public.attempt_question_snapshots FOR ALL USING (true);

-- 5. AUTO-CONFIRM USER & ELEVATE TO SUPER_ADMIN
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'rangkiangweb@gmail.com';

INSERT INTO public.profiles (id, full_name, email, role)
SELECT id, 'Super Administrator', email, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'rangkiangweb@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin', full_name = 'Super Administrator';

-- 6. SEED SAMPLE EXAM (Try Out SKD & Psikotes Kedinasan 2026)
INSERT INTO public.exams (
  id, title, slug, description, instructions, duration_minutes, status, shuffle_questions, shuffle_options, security_policy
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Try Out SKD & Psikotes Kedinasan 2026',
  'skd-psikotes-kedinasan-2026',
  'Simulasi ujian terpadu Tes Wawasan Kebangsaan (TWK), Tes Intelegensia Umum (TIU), dan Tes Karakteristik Pribadi (TKP).',
  'Pilihlah salah satu jawaban yang paling tepat. TWK/TIU dinilai benar (+5), salah (0). TKP dinilai berjenjang nilai 1 sampai 5 untuk setiap opsi A-E.',
  90,
  'published',
  false,
  false,
  '{"require_fullscreen":true,"disable_clipboard":true,"log_focus_loss":true,"log_connectivity":true,"warn_after_violations":2,"auto_submit_after_violations":5}'::jsonb
) ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title, description = EXCLUDED.description;

INSERT INTO public.exam_sections (id, exam_id, title, instructions, position)
VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Tes Wawasan Kebangsaan (TWK)', 'Kerjakan soal TWK dengan teliti.', 1),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Tes Karakteristik Pribadi (TKP)', 'Pilihlah opsi yang paling mencerminkan integritas dan profesionalitas.', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questions (
  id, exam_id, section_id, position, stem, scoring_mode, correct_score, incorrect_score, blank_score, explanation
) VALUES (
  '33333333-3333-3333-3333-333333333301',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  1,
  'Lembaga negara yang berwenang memutus sengketa kewenangan lembaga negara yang kewenangannya diberikan oleh Undang-Undang Dasar adalah...',
  'correctness',
  5,
  0,
  0,
  'Sesuai Pasal 24C UUD 1945, Mahkamah Konstitusi berwenang mengadili pada tingkat pertama dan terakhir yang putusannya bersifat final untuk memutus sengketa kewenangan lembaga negara yang kewenangannya diberikan oleh UUD.'
),
(
  '33333333-3333-3333-3333-333333333302',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  2,
  'Saat Anda sedang menyelesaikan laporan mendesak yang harus diserahkan sore ini, rekan kerja satu tim tiba-tiba meminta bantuan menyelesaikan tugasnya karena ia kurang paham. Sikap Anda adalah...',
  'option_value',
  0,
  0,
  0,
  'Nilai tertinggi diberikan pada sikap yang mampu mengelola prioritas pribadi tanpa mengabaikan rekan kerja (membantu setelah tugas utama selesai atau memberi panduan singkat).'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.question_options (question_id, label, content, position, is_correct, score_value) VALUES
('33333333-3333-3333-3333-333333333301', 'A', 'Mahkamah Agung', 1, false, null),
('33333333-3333-3333-3333-333333333301', 'B', 'Mahkamah Konstitusi', 2, true, null),
('33333333-3333-3333-3333-333333333301', 'C', 'Komisi Yudisial', 3, false, null),
('33333333-3333-3333-3333-333333333301', 'D', 'Dewan Perwakilan Rakyat', 4, false, null),
('33333333-3333-3333-3333-333333333301', 'E', 'Badan Pemeriksa Keuangan', 5, false, null),
('33333333-3333-3333-3333-333333333302', 'D', 'Memberikan petunjuk pokok cara penyelesaiannya secara ringkas lalu fokus menyelesaikan tugas saya.', 4, false, 4),
('33333333-3333-3333-3333-333333333302', 'E', 'Meminta rekan tim menunggu sebentar hingga tugas saya selesai, baru kemudian membantunya bersama-sama.', 5, false, 5)
ON CONFLICT (question_id, position) DO NOTHING;

-- Function: Admin Reset Attempt
CREATE OR REPLACE FUNCTION public.admin_reset_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.attempts;
  v_student_name text;
  v_exam_title text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mereset sesi ujian.';
  END IF;

  SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi ujian tidak ditemukan.';
  END IF;

  SELECT full_name INTO v_student_name FROM public.profiles WHERE id = v_attempt.user_id;
  SELECT title INTO v_exam_title FROM public.exams WHERE id = v_attempt.exam_id;

  DELETE FROM public.attempt_answers WHERE attempt_id = p_attempt_id;
  DELETE FROM public.attempt_events WHERE attempt_id = p_attempt_id;
  DELETE FROM public.attempt_question_snapshots WHERE attempt_id = p_attempt_id;
  DELETE FROM public.attempts WHERE id = p_attempt_id;

  UPDATE public.exam_assignments
  SET status = 'active'
  WHERE exam_id = v_attempt.exam_id AND user_id = v_attempt.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'student_name', COALESCE(v_student_name, 'Peserta'),
    'exam_title', COALESCE(v_exam_title, 'Ujian')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_attempt(uuid) TO authenticated;

-- 7. PERFORMANCE OPTIMIZATION INDEXES
CREATE INDEX IF NOT EXISTS idx_attempts_leaderboard 
ON public.attempts(exam_id, status, score DESC NULLS LAST, submitted_at ASC)
WHERE status IN ('submitted', 'expired');

CREATE INDEX IF NOT EXISTS idx_attempts_user_status 
ON public.attempts(user_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_status_started 
ON public.attempts(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_attempt_position 
ON public.attempt_question_snapshots(attempt_id, position ASC);

CREATE INDEX IF NOT EXISTS idx_exams_status_created 
ON public.exams(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_active_created 
ON public.announcements(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_options_position 
ON public.question_options(question_id, position ASC);

