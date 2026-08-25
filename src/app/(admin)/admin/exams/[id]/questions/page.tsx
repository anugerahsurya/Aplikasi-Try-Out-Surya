import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { ArrowLeft, Trash2, CheckCircle2, Award, Clock, FileText, Settings } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function ExamQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireAdmin();

  // Fetch exam
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (examError || !exam) {
    notFound();
  }

  // Fetch questions with options
  const { data: questions } = await supabase
    .from("questions")
    .select("*, question_options(*)")
    .eq("exam_id", id)
    .order("position", { ascending: true });

  const questionList = questions || [];

  async function deleteQuestion(formData: FormData) {
    "use server";
    const { supabase: s } = await requireAdmin();
    const qId = formData.get("question_id") as string;
    await s.from("questions").delete().eq("id", qId);
    revalidatePath(`/admin/exams/${id}/questions`);
  }

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "admin"}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Header Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Link
            href="/admin/exams"
            className="btn btn-ghost btn-sm"
            style={{ paddingLeft: 0 }}
          >
            <ArrowLeft size={16} /> Kembali ke Daftar Ujian
          </Link>
          <Link
            href={`/admin/exams/${exam.id}`}
            className="btn btn-outline btn-sm"
          >
            <Settings size={14} /> Pengaturan Ujian
          </Link>
        </div>

        {/* Exam Title Card */}
        <section className="card-navy" style={{ padding: "28px 26px", marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <span className="badge badge-dark">
              <Clock size={12} /> {exam.duration_minutes} Menit
            </span>
            <span className="badge badge-dark">
              <FileText size={12} /> {questionList.length} Butir Soal Terdaftar
            </span>
            <span
              className={`badge ${
                exam.status === "published" ? "badge-success" : "badge-warning"
              }`}
            >
              {exam.status.toUpperCase()}
            </span>
          </div>
          <h1 style={{ color: "#ffffff", fontSize: "1.75rem", margin: "4px 0 8px" }}>
            {exam.title}
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: "0.92rem", margin: 0 }}>
            Kelola dan susun butir-butir soal untuk ujian ini.
          </p>
        </section>

        {/* Existing Questions List */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: "1.3rem" }}>Daftar Soal ({questionList.length})</h2>
          </div>

          {questionList.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--muted)",
                background: "var(--navy-50)",
                marginBottom: 28,
              }}
            >
              Belum ada soal pada ujian ini. Silakan gunakan form di bawah untuk membuat soal pertama.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18, marginBottom: 32 }}>
              {questionList.map((q: any, idx: number) => {
                const options = (q.question_options || []).sort(
                  (a: any, b: any) => a.position - b.position
                );

                return (
                  <div key={q.id} className="card" style={{ padding: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="eyebrow">Nomor {idx + 1}</span>
                        <span
                          className={`badge ${
                            q.scoring_mode === "option_value"
                              ? "badge-navy"
                              : "badge-neutral"
                          }`}
                          style={{ fontSize: "0.76rem" }}
                        >
                          {q.scoring_mode === "option_value"
                            ? "Poin Opsi 1–5 (TKP)"
                            : `Benar (+${q.correct_score}), Salah (${q.incorrect_score})`}
                        </span>
                      </div>

                      <form action={deleteQuestion} style={{ margin: 0 }}>
                        <input type="hidden" name="question_id" value={q.id} />
                        <button
                          type="submit"
                          className="btn btn-ghost btn-sm"
                          title="Hapus Soal"
                          style={{ color: "var(--danger)" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </form>
                    </div>

                    <div style={{ fontSize: "1rem", lineHeight: 1.6, marginBottom: 16 }}>
                      {q.stem}
                    </div>

                    {/* Options list */}
                    <div style={{ display: "grid", gap: 8 }}>
                      {options.map((opt: any) => (
                        <div
                          key={opt.id}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--line)",
                            background: opt.is_correct ? "var(--success-bg)" : "var(--canvas)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "0.9rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <strong style={{ width: 24 }}>{opt.label}.</strong>
                            <span>{opt.content}</span>
                          </div>

                          <div>
                            {q.scoring_mode === "option_value" && (
                              <span className="badge badge-navy" style={{ fontSize: "0.78rem" }}>
                                Nilai: {opt.score_value ?? 0}
                              </span>
                            )}
                            {opt.is_correct && (
                              <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                                <CheckCircle2 size={12} /> Kunci Benar
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--navy-50)",
                          fontSize: "0.86rem",
                          color: "var(--navy-900)",
                        }}
                      >
                        <strong>Pembahasan:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Add Question Form */}
        <section>
          <QuestionForm examId={exam.id} nextPosition={questionList.length + 1} />
        </section>
      </div>
    </AppShell>
  );
}
