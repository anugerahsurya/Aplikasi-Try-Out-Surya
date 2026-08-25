export type AppRole = 'participant' | 'admin' | 'super_admin';
export type ExamStatus = 'draft' | 'published' | 'archived';
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired';
export type ScoringMode = 'correctness' | 'option_value';

export interface SecurityPolicy {
  require_fullscreen: boolean;
  disable_clipboard: boolean;
  log_focus_loss: boolean;
  log_connectivity: boolean;
  warn_after_violations: number;
  auto_submit_after_violations: number; // 0 = disabled
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  avatar_path?: string | null;
  phone?: string | null;
  institution?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  instructions?: string | null;
  duration_minutes: number;
  start_at?: string | null;
  end_at?: string | null;
  status: ExamStatus;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  security_policy: SecurityPolicy;
  result_release_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  _count?: {
    questions?: number;
    assignments?: number;
  };
}

export interface ExamSection {
  id: string;
  exam_id: string;
  title: string;
  instructions?: string | null;
  position: number;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  question_id?: string;
  label: string; // 'A', 'B', 'C', 'D', 'E'
  content: string;
  position: number;
  is_correct: boolean;
  score_value?: number | null; // Exact integer 1-5 for option_value mode
}

export interface Question {
  id: string;
  exam_id: string;
  section_id?: string | null;
  position: number;
  stem: string;
  media_path?: string | null;
  scoring_mode: ScoringMode;
  correct_score: number;
  incorrect_score: number;
  blank_score: number;
  explanation?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  options?: QuestionOption[];
}

export interface ExamAssignment {
  id: string;
  exam_id: string;
  user_id: string;
  assigned_at: string;
  attempt_limit: number;
  extra_time_minutes: number;
  status: 'active' | 'revoked';
  exam?: Exam;
  profile?: Profile;
}

export interface Attempt {
  id: string;
  exam_id: string;
  user_id: string;
  assignment_id?: string | null;
  status: AttemptStatus;
  started_at: string;
  deadline_at: string;
  submitted_at?: string | null;
  last_seen_at: string;
  score?: number | null;
  max_score?: number | null;
  violation_count: number;
  security_status: string;
  created_at: string;
  exam?: Exam;
  profile?: Profile;
}

export interface AttemptEvent {
  id: string;
  attempt_id: string;
  event_type: string;
  occurred_at: string;
  metadata: Record<string, any>;
}

export interface RunnerOption {
  id: string;
  label: string;
  content: string;
}

export interface RunnerQuestion {
  id: string;
  position: number;
  stem: string;
  options: RunnerOption[];
  selected_option_id?: string | null;
  is_flagged?: boolean;
}

export interface RunnerData {
  id: string;
  exam_id: string;
  status: AttemptStatus;
  deadline_at: string;
  security_policy: SecurityPolicy;
  title: string;
  duration_minutes?: number;
  questions: RunnerQuestion[];
}

export interface QuestionResultReview {
  id: string;
  position: number;
  stem: string;
  scoring_mode: ScoringMode;
  selected_option_id?: string | null;
  options: {
    id: string;
    label: string;
    content: string;
    is_correct?: boolean;
    score_value?: number | null;
  }[];
  earned_score: number;
  max_possible_score: number;
  explanation?: string | null;
}

export interface AttemptResultData {
  attempt: Attempt;
  exam: Exam;
  total_questions: number;
  answered_questions: number;
  blank_questions: number;
  is_released: boolean;
  review_questions?: QuestionResultReview[];
}
