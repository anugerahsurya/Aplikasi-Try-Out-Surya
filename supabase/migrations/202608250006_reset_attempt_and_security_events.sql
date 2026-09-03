-- Migration: 202608250006_reset_attempt_and_security_events.sql
-- Description:
-- 1. Adds explanation_pdf storage columns to exams
-- 2. Creates admin_reset_attempt RPC (SECURITY DEFINER)
-- 3. Adds DELETE RLS policies for admin on attempts and child tables
-- 4. Updates log_attempt_event to track screenshot and devtools violations

-- 1. ADD PDF STORAGE COLUMNS TO EXAMS
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS explanation_pdf text,
ADD COLUMN IF NOT EXISTS explanation_pdf_generated_at timestamptz;

-- 2. RLS DELETE POLICIES FOR ADMIN
-- Allow admin to delete attempts and associated records cleanly
DROP POLICY IF EXISTS "attempts delete" ON public.attempts;
CREATE POLICY "attempts delete" ON public.attempts 
FOR DELETE USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "attempt_answers delete" ON public.attempt_answers;
CREATE POLICY "attempt_answers delete" ON public.attempt_answers 
FOR DELETE USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.attempts WHERE id = attempt_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attempt_events delete" ON public.attempt_events;
CREATE POLICY "attempt_events delete" ON public.attempt_events 
FOR DELETE USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.attempts WHERE id = attempt_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attempt_question_snapshots delete" ON public.attempt_question_snapshots;
CREATE POLICY "attempt_question_snapshots delete" ON public.attempt_question_snapshots 
FOR DELETE USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.attempts WHERE id = attempt_id AND user_id = auth.uid()
  )
);

-- 3. RPC: ADMIN RESET ATTEMPT (SECURITY DEFINER)
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

  -- Delete all child records first
  DELETE FROM public.attempt_answers WHERE attempt_id = p_attempt_id;
  DELETE FROM public.attempt_events WHERE attempt_id = p_attempt_id;
  DELETE FROM public.attempt_question_snapshots WHERE attempt_id = p_attempt_id;
  DELETE FROM public.attempts WHERE id = p_attempt_id;

  -- Reset assignment back to active so participant can retake
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

-- 4. RPC: UPDATE LOG ATTEMPT EVENT WITH SCREENSHOT & DEVTOOLS DETECTION
CREATE OR REPLACE FUNCTION public.log_attempt_event(
  p_attempt_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.attempts WHERE id = p_attempt_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Attempt tidak ditemukan';
  END IF;

  INSERT INTO public.attempt_events(attempt_id, event_type, metadata)
  VALUES(p_attempt_id, LEFT(p_event_type, 80), p_metadata);

  -- Count violations for cheat-sensitive events
  IF p_event_type IN (
    'tab_hidden',
    'window_blur',
    'fullscreen_exit',
    'clipboard_attempt',
    'print_screen_attempt',
    'screenshot_attempt',
    'dev_tools_attempt'
  ) THEN
    UPDATE public.attempts 
    SET violation_count = violation_count + 1 
    WHERE id = p_attempt_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_attempt_event(uuid, text, jsonb) TO authenticated;
