import { ScoringMode } from "@/types";

export interface ScoringOption {
  id: string;
  is_correct: boolean;
  score_value?: number | null; // Integer 1-5 for option_value mode
}

export interface QuestionSnapshot {
  scoring_mode: ScoringMode;
  correct_score: number;
  incorrect_score: number;
  blank_score: number;
  options: ScoringOption[];
}

export function calculateQuestionScore(
  question: QuestionSnapshot,
  selectedOptionId?: string | null
): number {
  if (!selectedOptionId) {
    return Number(question.blank_score ?? 0);
  }

  const option = question.options.find((item) => item.id === selectedOptionId);
  if (!option) {
    return Number(question.blank_score ?? 0);
  }

  if (question.scoring_mode === "option_value") {
    if (typeof option.score_value === "number") {
      // Clamped to integer 1-5 or standard value
      return Math.round(option.score_value);
    }
    return Number(question.blank_score ?? 0);
  }

  // correctness mode
  return option.is_correct
    ? Number(question.correct_score)
    : Number(question.incorrect_score);
}

export function calculateTotalScore(
  questions: (QuestionSnapshot & { id: string })[],
  answers: { question_id: string; selected_option_id?: string | null }[]
): {
  totalScore: number;
  maxScore: number;
  breakdown: { question_id: string; earnedScore: number; maxScore: number }[];
} {
  const answerMap = new Map<string, string | null | undefined>();
  for (const a of answers) {
    answerMap.set(a.question_id, a.selected_option_id);
  }

  let totalScore = 0;
  let maxScore = 0;
  const breakdown: { question_id: string; earnedScore: number; maxScore: number }[] = [];

  for (const q of questions) {
    const selected = answerMap.get(q.id);
    const earned = calculateQuestionScore(q, selected);
    
    // Calculate max possible score for this question
    let maxPossible = 0;
    if (q.scoring_mode === "option_value") {
      const optionScores = q.options.map((o) => (typeof o.score_value === "number" ? o.score_value : 0));
      maxPossible = optionScores.length > 0 ? Math.max(...optionScores) : 5;
    } else {
      maxPossible = Math.max(Number(q.correct_score), Number(q.blank_score), Number(q.incorrect_score));
    }

    totalScore += earned;
    maxScore += maxPossible;
    breakdown.push({ question_id: q.id, earnedScore: earned, maxScore: maxPossible });
  }

  return { totalScore, maxScore, breakdown };
}
