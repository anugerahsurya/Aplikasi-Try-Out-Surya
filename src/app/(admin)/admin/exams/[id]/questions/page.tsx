import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { QuestionItem } from "@/components/admin/QuestionItem";
import { BulkQuestionImporter } from "@/components/admin/BulkQuestionImporter";
import { ArrowLeft, Clock, FileText, Settings, AlertCircle } from "lucide-react";
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

  async function deleteQuestionAction(questionId: string) {
    "use server";
    const { supabase: s } = await requireAdmin();
    await s.from("questions").delete().eq("id", questionId);
    revalidatePath(`/admin/exams/${id}/questions`);
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Header Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
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
        <section className="card-navy" style={{ padding: "24px 22px", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span className="badge badge-dark">
              <Clock size={12} /> {exam.duration_minutes} Menit
            </span>
            <span className="badge badge-dark">
              <FileText size={12} /> {questionList.length} Butir Soal
            </span>
            <span
              className={`badge ${
                exam.status === "published" ? "badge-success" : "badge-warning"
              }`}
            >
              {exam.status.toUpperCase()}
            </span>
          </div>
          <h1 style={{ color: "#ffffff", fontSize: "1.6rem", margin: "4px 0 6px" }}>
            {exam.title}
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: "0.88rem", margin: 0 }}>
            Kelola dan susun butir-butir soal untuk paket simulasi ujian ini.
          </p>
        </section>

        {/* Existing Questions List */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.25rem" }}>Daftar Soal ({questionList.length})</h2>
          </div>

          {questionList.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-muted)",
                background: "var(--bg-surface-secondary)",
                marginBottom: 24,
              }}
            >
              <AlertCircle size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
              <p style={{ fontWeight: 600, margin: 0 }}>Belum ada soal pada ujian ini.</p>
              <p style={{ fontSize: "0.84rem", marginTop: 4 }}>
                Silakan gunakan form builder atau impor massal via JSON di bawah.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14, marginBottom: 28 }}>
              {questionList.map((q: any, idx: number) => (
                <QuestionItem
                  key={q.id}
                  question={q}
                  index={idx}
                  onDelete={deleteQuestionAction}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bulk JSON Importer Section */}
        <section style={{ marginBottom: 28 }}>
          <BulkQuestionImporter examId={exam.id} />
        </section>

        {/* Single Add Question Form Builder */}
        <section>
          <QuestionForm examId={exam.id} nextPosition={questionList.length + 1} />
        </section>
      </div>
  );
}
