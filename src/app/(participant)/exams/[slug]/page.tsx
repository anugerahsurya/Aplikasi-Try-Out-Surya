import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Clock, ShieldAlert, FileText, CheckCircle, ArrowLeft, Play, AlertTriangle } from "lucide-react";
import { Exam, Profile } from "@/types";

import { createAdminClient } from "@/lib/supabase/admin";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  // Query exam by UUID or slug
  let examQuery = supabase
    .from("exams")
    .select("*, questions(id, position, scoring_mode, section_id)");

  if (isUuid) {
    examQuery = examQuery.eq("id", slug);
  } else {
    examQuery = examQuery.eq("slug", slug);
  }

  let { data: exam } = await examQuery.maybeSingle();

  // If not found via user client, try admin client for admin/super_admin
  if (!exam && (profile?.role === "admin" || profile?.role === "super_admin")) {
    const adminSupabase = createAdminClient();
    let adminQuery = adminSupabase
      .from("exams")
      .select("*, questions(id, position, scoring_mode, section_id)");
    if (isUuid) {
      adminQuery = adminQuery.eq("id", slug);
    } else {
      adminQuery = adminQuery.eq("slug", slug);
    }
    const { data: adminExam } = await adminQuery.maybeSingle();
    if (adminExam) {
      exam = adminExam;
    }
  }

  if (!exam) {
    notFound();
  }

  // Check assignment
  let { data: assignment } = await supabase
    .from("exam_assignments")
    .select("*")
    .eq("exam_id", exam.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  // If published exam or admin user, auto-provision assignment if not yet existing
  if (!assignment && (exam.status === "published" || profile?.role === "admin" || profile?.role === "super_admin")) {
    const { data: autoAssigned } = await supabase
      .from("exam_assignments")
      .upsert(
        {
          exam_id: exam.id,
          user_id: user.id,
          attempt_limit: 1,
          status: "active",
        },
        { onConflict: "exam_id,user_id" }
      )
      .select()
      .maybeSingle();
    assignment = autoAssigned;
  }

  // Check if there is an in-progress attempt
  const { data: existingAttempt } = await supabase
    .from("attempts")
    .select("id, status, started_at, deadline_at")
    .eq("exam_id", exam.id)
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  const questionsCount = exam.questions?.length || 0;
  const hasOptionValueQuestions = exam.questions?.some(
    (q: any) => q.scoring_mode === "option_value"
  );
  const hasCorrectnessQuestions = exam.questions?.some(
    (q: any) => q.scoring_mode === "correctness"
  );

  async function handleStartExam() {
    "use server";
    const { supabase: s, user: u } = await requireUser();

    // Ensure assignment exists
    await s
      .from("exam_assignments")
      .upsert(
        {
          exam_id: exam.id,
          user_id: u.id,
          attempt_limit: 1,
          status: "active",
        },
        { onConflict: "exam_id,user_id" }
      );

    // Call start_or_resume_attempt RPC
    const { data: attemptId, error } = await s.rpc("start_or_resume_attempt", {
      p_exam_id: exam.id,
    });

    if (error) {
      console.error("Start attempt error:", error);
      throw new Error(error.message);
    }

    redirect(`/tryout/${attemptId}`);
  }

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      <Link
        href="/dashboard"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 18, paddingLeft: 0 }}
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

        {/* Exam Header Card */}
        <section className="card-navy" style={{ padding: "36px 32px", marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="badge badge-dark">
              <Clock size={14} /> Durasi: {exam.duration_minutes} Menit
            </span>
            <span className="badge badge-dark">
              <FileText size={14} /> {questionsCount} Butir Soal
            </span>
            {exam.security_policy?.require_fullscreen && (
              <span className="badge badge-warning">
                <ShieldAlert size={14} /> Fullscreen Wajib
              </span>
            )}
          </div>

          <h1 style={{ fontSize: "2rem", margin: "8px 0 14px", color: "#ffffff" }}>
            {exam.title}
          </h1>

          <p style={{ color: "#cbd5e1", fontSize: "1.02rem", lineHeight: 1.6, margin: 0 }}>
            {exam.description || "Ujian evaluasi dan simulasi terstandar."}
          </p>
        </section>

        {/* Instructions & Scoring Guide */}
        <div className="grid grid-2" style={{ marginBottom: 28 }}>
          {/* Petunjuk Pengerjaan */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} color="var(--brand-accent)" /> Petunjuk Pengerjaan
            </h3>
            <div style={{ fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
              <p style={{ marginBottom: 10 }}>
                {exam.instructions ||
                  "Baca dan cermati setiap soal sebelum memilih jawaban yang tersedia."}
              </p>
              <ul style={{ paddingLeft: 20, margin: "10px 0" }}>
                <li>Waktu ujian berjalan secara otomatis dari server dan tidak dapat dihentikan sementara.</li>
                <li>Jawaban Anda otomatis tersimpan (autosave) secara berkala.</li>
                <li>Gunakan tombol tanda ragu-ragu jika Anda ingin meninjau kembali soal tersebut nanti.</li>
              </ul>
            </div>
          </div>

          {/* Model Penilaian */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={18} color="var(--success)" /> Skema Penilaian
            </h3>
            <div style={{ fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
              {hasCorrectnessQuestions && (
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: "var(--text-primary)" }}>Soal Pilihan Ganda Standar:</strong>
                  <p style={{ margin: "4px 0 0" }}>
                    Benar mendapatkan poin penuh, salah atau kosong mendapatkan nilai sesuai bobot soal.
                  </p>
                </div>
              )}
              {hasOptionValueQuestions && (
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Soal Karakteristik / Poin Opsi (TKP):</strong>
                  <p style={{ margin: "4px 0 0" }}>
                    Setiap pilihan opsi A–E memiliki skor berjenjang <strong>tepat nilai 1 sampai 5</strong>. Tidak ada jawaban salah (jawaban kosong bernilai 0).
                  </p>
                </div>
              )}
              {!hasCorrectnessQuestions && !hasOptionValueQuestions && (
                <p>Skor dihitung berdasarkan bobot yang ditentukan pengawas ujian.</p>
              )}
            </div>
          </div>
        </div>

        {/* Anti-Cheating & Browser Notice */}
        <section
          className="card"
          style={{
            padding: 24,
            marginBottom: 32,
            background: "var(--warning-bg)",
            border: "1px solid var(--warning-border)",
          }}
        >
          <h4
            style={{
              color: "var(--warning)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <AlertTriangle size={20} /> Tata Tertib & Ketentuan Pengawasan
          </h4>
          <ul style={{ paddingLeft: 20, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.6 }}>
            <li>
              Ujian berjalan dalam mode <strong>Layar Penuh (Fullscreen)</strong>. Keluar dari fullscreen akan dicatat sebagai pelanggaran.
            </li>
            <li>
              Membuka tab baru, memindahkan fokus jendela, atau menggunakan shortcut clipboard (Copy/Paste) akan terekam oleh sistem audit pengawas.
            </li>
            {exam.security_policy?.auto_submit_after_violations > 0 && (
              <li>
                Ujian akan <strong>otomatis terkirim (auto-submit)</strong> jika jumlah pelanggaran mencapai batas maksimal ({exam.security_policy.auto_submit_after_violations} kali).
              </li>
            )}
          </ul>
        </section>

        {/* Start / Resume Action */}
        <div
          className="card"
          style={{
            padding: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h4 style={{ margin: 0 }}>
              {existingAttempt ? "Sesi Ujian Masih Aktif" : "Sudah Siap Memulai?"}
            </h4>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.88rem" }}>
              {existingAttempt
                ? "Anda dapat langsung melanjutkan pengerjaan sesi yang sedang berjalan."
                : "Klik tombol di samping untuk memulai penghitungan waktu ujian."}
            </p>
          </div>

          <form action={handleStartExam} style={{ margin: 0 }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ fontWeight: 800 }}
              disabled={!assignment && !existingAttempt}
            >
              <Play size={18} /> {existingAttempt ? "Lanjutkan Ujian" : "Mulai Ujian Sekarang"}
            </button>
          </form>
        </div>
      </div>
  );
}
