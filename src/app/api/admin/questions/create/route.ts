import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const formData = await request.formData();
    const examId = formData.get("exam_id") as string;
    const position = parseInt(formData.get("position") as string, 10) || 1;
    const scoringMode = (formData.get("scoring_mode") as string) || "correctness";
    const stem = formData.get("stem") as string;
    const explanation = (formData.get("explanation") as string) || null;

    const correctScore = parseFloat(formData.get("correct_score") as string) || 4;
    const incorrectScore = parseFloat(formData.get("incorrect_score") as string) || -1;
    const blankScore = parseFloat(formData.get("blank_score") as string) || 0;

    const correctOptionLabel = formData.get("correct_option") as string;

    // 1. Insert Question
    const { data: newQuestion, error: qError } = await supabase
      .from("questions")
      .insert({
        exam_id: examId,
        position,
        stem,
        scoring_mode: scoringMode,
        correct_score: scoringMode === "correctness" ? correctScore : 0,
        incorrect_score: scoringMode === "correctness" ? incorrectScore : 0,
        blank_score: scoringMode === "correctness" ? blankScore : 0,
        explanation,
      })
      .select()
      .single();

    if (qError || !newQuestion) {
      console.error("Question insert error:", qError);
      return NextResponse.json({ error: qError?.message || "Failed to create question" }, { status: 400 });
    }

    // 2. Insert 5 Options (A-E)
    const labels = ["A", "B", "C", "D", "E"];
    const optionsToInsert = labels.map((lbl, idx) => {
      const content = (formData.get(`option_content_${lbl}`) as string) || `Opsi ${lbl}`;
      const isCorrect = scoringMode === "correctness" && correctOptionLabel === lbl;
      let scoreValue: number | null = null;

      if (scoringMode === "option_value") {
        const rawScore = parseInt(formData.get(`option_score_${lbl}`) as string, 10);
        scoreValue = isNaN(rawScore) ? 1 : Math.max(1, Math.min(5, rawScore));
      }

      return {
        question_id: newQuestion.id,
        label: lbl,
        content,
        position: idx + 1,
        is_correct: isCorrect,
        score_value: scoreValue,
      };
    });

    const { error: optError } = await supabase
      .from("question_options")
      .insert(optionsToInsert);

    if (optError) {
      console.error("Options insert error:", optError);
    }

    // Redirect back to question builder
    return NextResponse.redirect(new URL(`/admin/exams/${examId}/questions`, request.url), 303);
  } catch (err: any) {
    console.error("Error creating question:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
