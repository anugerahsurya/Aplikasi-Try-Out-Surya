-- Performance Optimization Indexes
-- Indexes for Leaderboard, History, Active Sessions, and Question Loading

-- 1. Leaderboard query index (exam_id, status, score DESC, submitted_at ASC)
CREATE INDEX IF NOT EXISTS idx_attempts_leaderboard 
ON public.attempts(exam_id, status, score DESC NULLS LAST, submitted_at ASC)
WHERE status IN ('submitted', 'expired');

-- 2. Participant history & active attempts index (user_id, status, submitted_at DESC)
CREATE INDEX IF NOT EXISTS idx_attempts_user_status 
ON public.attempts(user_id, status, submitted_at DESC);

-- 3. Live sessions and status filter index
CREATE INDEX IF NOT EXISTS idx_attempts_status_started 
ON public.attempts(status, started_at DESC);

-- 4. Question snapshots order index (accelerates Quiz Runner and review sheets)
CREATE INDEX IF NOT EXISTS idx_snapshots_attempt_position 
ON public.attempt_question_snapshots(attempt_id, position ASC);

-- 5. Exam catalog index by status and creation time
CREATE INDEX IF NOT EXISTS idx_exams_status_created 
ON public.exams(status, created_at DESC);

-- 6. Active announcements index
CREATE INDEX IF NOT EXISTS idx_announcements_active_created 
ON public.announcements(is_active, created_at DESC);

-- 7. Question Options position index
CREATE INDEX IF NOT EXISTS idx_question_options_position 
ON public.question_options(question_id, position ASC);
