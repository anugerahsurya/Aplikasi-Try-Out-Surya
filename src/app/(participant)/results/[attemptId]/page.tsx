import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Award, CheckCircle2, Clock, Calendar, ArrowLeft, Trophy, Check, X, ShieldAlert, Sparkles, BookOpen } from "lucide-react";
import { Attempt, Exam, Profile } from "@/types";
import { calculateQuestionScore } from "@/lib/scoring";
import { AutoExitFullscreen } from "@/components/exam/AutoExitFullscreen";
import QuestionReviewList from "@/components/results/QuestionReviewList";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("*, exam:exams(*)")
    .eq("id", attemptId)
    .maybeSingle();


  if (attemptError || !attempt) {
    notFound();
  }

  const exam = attempt.exam as Exam;
  const isReleased =
    !exam.result_release_at || new Date(exam.result_release_at) <= new Date();

  // Fetch snapshots, answers, and question explanations if released
  let questionReviews: any[] = [];
  let totalScoreCalculated = attempt.score ?? 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let blankCount = 0;

  if (isReleased) {
    const [
      { data: snapshots },
      { data: answers },
      { data: questionsData }
    ] = await Promise.all([
      supabase
        .from("attempt_question_snapshots")
        .select("*")
        .eq("attempt_id", attemptId)
        .order("position", { ascending: true }),
      supabase
        .from("attempt_answers")
        .select("*")
        .eq("attempt_id", attemptId),
      supabase
        .from("questions")
        .select("id, explanation")
        .eq("exam_id", exam.id),
    ]);

    const answerMap = new Map<string, string | null>();
    (answers || []).forEach((a: any) => {
      answerMap.set(a.question_id, a.selected_option_id);
    });

    const explanationMap = new Map<string, string | null>();
    (questionsData || []).forEach((q: any) => {
      explanationMap.set(q.id, q.explanation);
    });

    if (snapshots) {
      questionReviews = snapshots.map((s: any) => {
        const selectedOptionId = answerMap.get(s.question_id);
        const earnedScore = calculateQuestionScore(
          {
            scoring_mode: s.scoring_mode,
            correct_score: s.correct_score,
            incorrect_score: s.incorrect_score,
            blank_score: s.blank_score,
            options: s.options || [],
          },
          selectedOptionId
        );

        const isBlank = !selectedOptionId;
        const isCorrect = earnedScore > 0;
        if (isBlank) blankCount++;
        else if (isCorrect) correctCount++;
        else incorrectCount++;

        return {
          id: s.question_id,
          position: s.position,
          stem: s.stem,
          scoring_mode: s.scoring_mode,
          options: s.options || [],
          selectedOptionId,
          earnedScore,
          isCorrect,
          isBlank,
          explanation: explanationMap.get(s.question_id),
        };
      });
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <AutoExitFullscreen />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <Link
          href="/dashboard"
          className="btn btn-ghost btn-sm"
          style={{ paddingLeft: 0 }}
        >
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </Link>

        <Link
          href={`/leaderboard/${exam.id}`}
          className="btn btn-primary btn-sm"
        >
          <Trophy size={14} /> Lihat Peringkat (Leaderboard)
        </Link>
      </div>

      {/* Result Header Card */}
      <section
        className="card-navy"
        style={{
          padding: "32px 28px",
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.12)",
            color: "#60a5fa",
            marginBottom: 14,
          }}
        >
          <Award size={28} />
        </div>

        <span className="eyebrow" style={{ color: "#93c5fd" }}>
          Hasil & Evaluasi Pengerjaan
        </span>
        <h1 style={{ color: "#ffffff", fontSize: "1.85rem", margin: "4px 0 10px" }}>
          {exam.title}
        </h1>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginTop: 18 }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              minWidth: 120,
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1", display: "block" }}>
              Status Sesi
            </span>
            <strong style={{ fontSize: "1.1rem", color: "#4ade80" }}>
              {attempt.status === "submitted" ? "Terkumpul" : "Waktu Habis"}
            </strong>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              minWidth: 120,
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1", display: "block" }}>
              Total Skor
            </span>
            <strong style={{ fontSize: "1.6rem", color: "#ffffff", letterSpacing: "-0.03em" }}>
              {isReleased ? totalScoreCalculated : "—"}
            </strong>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              minWidth: 120,
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1", display: "block" }}>
              Benar / Salah / Kosong
            </span>
            <strong style={{ fontSize: "1.1rem", color: "#ffffff" }}>
              <span style={{ color: "#4ade80" }}>{correctCount}</span> /{" "}
              <span style={{ color: "#f87171" }}>{incorrectCount}</span> /{" "}
              <span style={{ color: "#94a3b8" }}>{blankCount}</span>
            </strong>
          </div>
        </div>
      </section>

      {/* Not Released Notice */}
      {!isReleased && (
        <section
          className="card"
          style={{
            padding: 32,
            textAlign: "center",
            marginBottom: 32,
            background: "var(--bg-surface)",
          }}
        >
          <Calendar size={36} color="var(--brand-accent)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ margin: "0 0 8px" }}>Pembahasan Soal Belum Dirilis</h3>
          <p className="muted" style={{ maxWidth: 500, margin: "0 auto", fontSize: "0.92rem" }}>
            Administrator menetapkan jadwal rilis kunci jawaban pada{" "}
            <strong>
              {new Date(exam.result_release_at!).toLocaleString("id-ID", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </strong>
            .
          </p>
        </section>
      )}

      {/* Detailed Question Review & Explanations (If Released) */}
      {isReleased && questionReviews.length > 0 && (
        <QuestionReviewList questions={questionReviews} />
      )}
    </div>
  );
}
