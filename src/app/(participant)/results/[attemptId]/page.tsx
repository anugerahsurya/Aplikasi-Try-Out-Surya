import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Award, CheckCircle2, Clock, Calendar, ArrowLeft, HelpCircle, Check, X, ShieldAlert } from "lucide-react";
import { Attempt, Exam, Profile } from "@/types";
import { calculateQuestionScore } from "@/lib/scoring";

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
    .single();

  // Fetch attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("*, exam:exams(*)")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    notFound();
  }

  const exam = attempt.exam as Exam;
  const isReleased =
    !exam.result_release_at || new Date(exam.result_release_at) <= new Date();

  // Fetch snapshots and answers if released
  let questionReviews: any[] = [];
  let totalScoreCalculated = attempt.score ?? 0;

  if (isReleased) {
    const { data: snapshots } = await supabase
      .from("attempt_question_snapshots")
      .select("*")
      .eq("attempt_id", attemptId)
      .order("position", { ascending: true });

    const { data: answers } = await supabase
      .from("attempt_answers")
      .select("*")
      .eq("attempt_id", attemptId);

    const answerMap = new Map<string, string | null>();
    (answers || []).forEach((a: any) => {
      answerMap.set(a.question_id, a.selected_option_id);
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

        return {
          id: s.question_id,
          position: s.position,
          stem: s.stem,
          scoring_mode: s.scoring_mode,
          options: s.options || [],
          selectedOptionId,
          earnedScore,
        };
      });
    }
  }

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "participant"}
    >
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <Link
          href="/dashboard"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 18, paddingLeft: 0 }}
        >
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </Link>

        {/* Result Header Card */}
        <section
          className="card-navy"
          style={{
            padding: "36px 32px",
            marginBottom: 28,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.12)",
              color: "#60a5fa",
              marginBottom: 16,
            }}
          >
            <Award size={32} />
          </div>

          <span className="eyebrow" style={{ color: "#93c5fd" }}>
            Hasil & Evaluasi Ujian
          </span>
          <h1 style={{ color: "#ffffff", fontSize: "2rem", margin: "6px 0 12px" }}>
            {exam.title}
          </h1>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginTop: 20 }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                padding: "12px 24px",
                borderRadius: "var(--radius-md)",
                minWidth: 140,
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#cbd5e1", display: "block" }}>
                Status Sesi
              </span>
              <strong style={{ fontSize: "1.15rem", color: "#4ade80" }}>
                {attempt.status === "submitted" ? "Terkumpul" : "Waktu Habis"}
              </strong>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                padding: "12px 24px",
                borderRadius: "var(--radius-md)",
                minWidth: 140,
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#cbd5e1", display: "block" }}>
                Total Skor Anda
              </span>
              <strong style={{ fontSize: "1.7rem", color: "#ffffff", letterSpacing: "-0.03em" }}>
                {isReleased ? totalScoreCalculated : "—"}
              </strong>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                padding: "12px 24px",
                borderRadius: "var(--radius-md)",
                minWidth: 140,
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#cbd5e1", display: "block" }}>
                Pelanggaran Keamanan
              </span>
              <strong
                style={{
                  fontSize: "1.15rem",
                  color: attempt.violation_count > 0 ? "#fca5a5" : "#4ade80",
                }}
              >
                {attempt.violation_count} Kali
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
              background: "var(--navy-50)",
            }}
          >
            <Calendar size={36} color="var(--navy-600)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 8px" }}>Pembahasan Soal Belum Dirilis</h3>
            <p className="muted" style={{ maxWidth: 500, margin: "0 auto", fontSize: "0.92rem" }}>
              Administrator menetapkan jadwal rilis skor dan kunci jawaban pada{" "}
              <strong>
                {new Date(exam.result_release_at!).toLocaleString("id-ID", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </strong>
              . Silakan kembali pada waktu yang ditentukan.
            </p>
          </section>
        )}

        {/* Detailed Question Review (If Released) */}
        {isReleased && questionReviews.length > 0 && (
          <section>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.35rem" }}>Review & Pembahasan Soal</h2>
              <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
                Analisis jawaban Anda dan perolehan poin per soal
              </p>
            </div>

            <div style={{ display: "grid", gap: 20 }}>
              {questionReviews.map((q, idx) => (
                <div key={q.id} className="card" style={{ padding: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <span className="eyebrow">Soal Nomor {idx + 1}</span>
                    <span
                      className={`badge ${
                        q.earnedScore > 0 ? "badge-success" : "badge-neutral"
                      }`}
                      style={{ fontSize: "0.85rem", padding: "4px 12px" }}
                    >
                      Poin: {q.earnedScore}
                    </span>
                  </div>

                  <div style={{ fontSize: "1rem", lineHeight: 1.6, marginBottom: 18 }}>
                    {q.stem}
                  </div>

                  {/* Options Review */}
                  <div style={{ display: "grid", gap: 8 }}>
                    {q.options.map((opt: any) => {
                      const isUserChoice = q.selectedOptionId === opt.id;
                      const isKeyAnswer = opt.is_correct;

                      let borderColor = "var(--line)";
                      let bg = "#ffffff";
                      if (isUserChoice) {
                        borderColor = "var(--navy-800)";
                        bg = "var(--navy-100)";
                      }
                      if (isKeyAnswer) {
                        borderColor = "var(--success)";
                        bg = "var(--success-bg)";
                      }

                      return (
                        <div
                          key={opt.id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "var(--radius-sm)",
                            border: `1.5px solid ${borderColor}`,
                            background: bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            fontSize: "0.92rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <strong
                              style={{
                                width: 26,
                                height: 26,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 6,
                                background: isUserChoice ? "var(--navy-900)" : "#e2e8f0",
                                color: isUserChoice ? "#ffffff" : "var(--navy-900)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {opt.label}
                            </strong>
                            <span>{opt.content}</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {q.scoring_mode === "option_value" && (
                              <span className="badge badge-navy" style={{ fontSize: "0.75rem" }}>
                                Skor Opsi: {opt.score_value ?? 0}
                              </span>
                            )}
                            {isUserChoice && (
                              <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                                Pilihan Anda
                              </span>
                            )}
                            {isKeyAnswer && (
                              <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>
                                <Check size={12} /> Kunci Jawaban
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
