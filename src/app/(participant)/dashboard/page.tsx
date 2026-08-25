import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Play,
  CheckCircle2,
  Award,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Target,
  Sparkles,
  BookOpen,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function ParticipantDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Parallel data fetching
  const [
    { data: activeAttempt },
    { data: assignments },
    { data: publishedExams },
    { data: completedAttempts },
  ] = await Promise.all([
    supabase
      .from("attempts")
      .select("*, exam:exams(*)")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("exam_assignments")
      .select("*, exam:exams(*)")
      .eq("user_id", user.id),
    supabase
      .from("exams")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase
      .from("attempts")
      .select("*, exam:exams(*)")
      .eq("user_id", user.id)
      .in("status", ["submitted", "expired"])
      .order("submitted_at", { ascending: false }),
  ]);

  const assignedExams =
    assignments && assignments.length > 0
      ? assignments.map((a: any) => a.exam).filter(Boolean)
      : publishedExams || [];

  const totalExamsCount = assignedExams.length;
  const completedCount = completedAttempts?.length || 0;
  const estimatedProbability = completedCount > 0 ? Math.min(96, 75 + completedCount * 7) : 78;

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "participant"}
    >
      <div>
        {/* Welcome Banner with Rich Soft Indigo Gradient (Inspired by Image 2) */}
        <section
          className="card"
          style={{
            padding: "24px 22px",
            marginBottom: 24,
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(56, 189, 248, 0.06) 50%, var(--bg-surface) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.18)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span className="badge badge-navy">
                  <Sparkles size={12} /> Portal Peserta Try Out
                </span>
              </div>
              <h1 style={{ fontSize: "1.65rem", margin: "4px 0 6px", fontWeight: 800 }}>
                Halo, {profile?.full_name || user.email?.split("@")[0]}! 👋
              </h1>
              <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
                Apa yang ingin Anda latih dan asah hari ini? Pilih paket simulasi di bawah untuk memulai.
              </p>
            </div>

            {/* Quick Readiness Widget (Ref Image 2 Passing Probability) */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--card-shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span className="muted" style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase" }}>
                    Passing Probability
                  </span>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--success)" }}>
                    {estimatedProbability}%
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--card-shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(99, 102, 241, 0.12)",
                    color: "var(--brand-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Target size={20} />
                </div>
                <div>
                  <span className="muted" style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase" }}>
                    Selesai Dikerjakan
                  </span>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {completedCount} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {totalExamsCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Active Attempt Banner (If currently taking an exam) */}
        {activeAttempt && (
          <section
            className="card card-hover"
            style={{
              padding: "18px 20px",
              marginBottom: 26,
              borderLeft: "5px solid var(--warning)",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-surface) 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div>
                <span className="badge badge-warning" style={{ marginBottom: 6 }}>
                  <Clock size={12} /> Sesi Sedang Berjalan
                </span>
                <h3 style={{ margin: "2px 0 4px", fontSize: "1.15rem" }}>
                  {activeAttempt.exam?.title || "Sesi Ujian Aktif"}
                </h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
                  Batas waktu penyelesaian:{" "}
                  <strong>{new Date(activeAttempt.deadline_at).toLocaleTimeString("id-ID")}</strong>
                </p>
              </div>
              <Link
                href={`/tryout/${activeAttempt.id}`}
                className="btn btn-accent btn-lg"
                style={{ fontWeight: 700 }}
              >
                Lanjutkan Pengerjaan <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        )}

        {/* Practice Topics / Assigned Exams List (Ref Image 2 Topics Grid) */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: "1.25rem" }}>Pilihan Simulasi Ujian</h2>
              <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>
                Pilih paket soal untuk menguji kemampuan Anda
              </p>
            </div>
            <span className="badge badge-navy">{assignedExams.length} Paket Ujian</span>
          </div>

          {assignedExams.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "36px 20px",
                textAlign: "center",
                color: "var(--muted)",
                background: "var(--bg-surface-secondary)",
              }}
            >
              <AlertCircle size={32} style={{ margin: "0 auto 10px", opacity: 0.5, color: "var(--brand-accent)" }} />
              <p style={{ fontWeight: 700, margin: 0 }}>Belum ada simulasi yang ditugaskan untuk akun Anda.</p>
              <p style={{ fontSize: "0.84rem", marginTop: 4 }}>
                Hubungi administrator untuk menambahkan akses paket soal try out.
              </p>
            </div>
          ) : (
            <div className="grid grid-2">
              {assignedExams.map((exam, idx) => {
                const isAttempted = completedAttempts?.some((a: any) => a.exam_id === exam.id);
                const isVioletTint = idx % 2 === 0;

                return (
                  <div
                    key={exam.id}
                    className={`card card-hover ${isVioletTint ? "card-tinted-violet" : "card-tinted-emerald"}`}
                    style={{
                      padding: "20px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                        <span className="badge badge-navy">
                          <Clock size={12} /> {exam.duration_minutes} Menit
                        </span>
                        {exam.security_policy?.require_fullscreen && (
                          <span className="badge badge-warning" title="Pengawasan Layar Penuh">
                            <ShieldAlert size={12} /> Mode Fullscreen
                          </span>
                        )}
                        {isAttempted && (
                          <span className="badge badge-success">
                            <CheckCircle size={12} /> Pernah Dikerjakan
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: isVioletTint ? "rgba(99, 102, 241, 0.14)" : "rgba(16, 185, 129, 0.14)",
                            color: isVioletTint ? "var(--brand-accent)" : "var(--success)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <BookOpen size={20} />
                        </div>

                        <div>
                          <h3 style={{ fontSize: "1.12rem", margin: "0 0 4px", fontWeight: 700 }}>
                            {exam.title}
                          </h3>
                          <p
                            className="muted"
                            style={{
                              fontSize: "0.86rem",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: 1.5,
                              margin: 0,
                            }}
                          >
                            {exam.description || "Simulasi ujian terstandar dengan evaluasi instan."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                      <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                        {isAttempted ? "Status: Selesai" : "Siap Dikerjakan"}
                      </span>

                      <Link
                        href={`/exams/${exam.slug || exam.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ padding: "6px 14px" }}
                      >
                        <Play size={14} /> {isAttempted ? "Ulangi / Detail" : "Mulai Ujian"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed Exam History */}
        {completedAttempts && completedAttempts.length > 0 && (
          <section>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: "1.25rem" }}>Riwayat & Hasil Pengerjaan</h2>
              <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>
                Arsip skor dan rincian evaluasi jawaban Anda
              </p>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Judul Ujian</th>
                    <th>Waktu Selesai</th>
                    <th>Status</th>
                    <th>Skor Perolehan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {completedAttempts.map((attempt: any) => {
                    const exam = attempt.exam;
                    const isReleased =
                      !exam?.result_release_at || new Date(exam.result_release_at) <= new Date();

                    return (
                      <tr key={attempt.id}>
                        <td style={{ fontWeight: 700 }}>{exam?.title || "Ujian"}</td>
                        <td className="muted">
                          {attempt.submitted_at
                            ? new Date(attempt.submitted_at).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "-"}
                        </td>
                        <td>
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} /> Selesai
                          </span>
                        </td>
                        <td>
                          {isReleased ? (
                            <strong style={{ color: "var(--text-primary)", fontSize: "1rem" }}>
                              {attempt.score ?? "-"}
                            </strong>
                          ) : (
                            <span className="badge badge-neutral">Menunggu Rilis</span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/results/${attempt.id}`}
                            className="btn btn-outline btn-sm"
                          >
                            <Award size={13} /> Lihat Hasil
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
