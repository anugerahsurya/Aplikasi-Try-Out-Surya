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
  
  // Passing probability calculation based on actual completed exams
  let estimatedProbability = 0;
  if (completedCount > 0 && completedAttempts) {
    const validScores = completedAttempts.filter((a: any) => typeof a.score === "number");
    if (validScores.length > 0) {
      const avgScore = validScores.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / validScores.length;
      // Normalized rate (0 - 100%)
      estimatedProbability = Math.min(100, Math.max(0, Math.round(avgScore > 100 ? (avgScore / 500) * 100 : avgScore)));
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Warm Greeting Hero */}
        <section
          className="stat-card-crafted"
          style={{
            padding: "24px 22px",
            marginBottom: 24,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
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

            {/* Quick Readiness Widget */}
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
                    background: completedCount > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.12)",
                    color: completedCount > 0 ? "var(--success)" : "var(--text-muted)",
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
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: completedCount > 0 ? "var(--success)" : "var(--text-muted)" }}>
                    {completedCount > 0 ? `${estimatedProbability}%` : "0%"}
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
                    background: "rgba(37, 99, 235, 0.12)",
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
            className="stat-card-crafted"
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
                className="btn btn-primary btn-lg"
                style={{ fontWeight: 700 }}
              >
                Lanjutkan Pengerjaan <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        )}

        {/* Practice Topics / Assigned Exams List */}
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
                color: "var(--text-muted)",
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
                const isNavyTint = idx % 2 === 0;

                return (
                  <div
                    key={exam.id}
                    className="stat-card-crafted"
                    style={{
                      padding: "20px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 14,
                      background: "var(--bg-surface)",
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
                          className="stat-icon-box"
                          style={{
                            background: "rgba(37, 99, 235, 0.1)",
                            color: "var(--brand-accent)",
                          }}
                        >
                          <BookOpen size={18} />
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
                        <Play size={13} /> Mulai Simulasi
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* History / Completed Attempts Section */}
        {completedAttempts && completedAttempts.length > 0 && (
          <section className="card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontSize: "1.12rem", margin: 0 }}>Riwayat Simulasi Terakhir</h3>
              <span className="badge badge-neutral">{completedAttempts.length} Riwayat</span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {completedAttempts.map((att: any) => (
                <div
                  key={att.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface-secondary)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "var(--radius-pill)",
                        background: "var(--success-bg)",
                        color: "var(--success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Award size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.92rem", display: "block" }}>
                        {att.exam?.title || "Ujian"}
                      </strong>
                      <span className="muted" style={{ fontSize: "0.78rem" }}>
                        Selesai pada: {new Date(att.submitted_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ textAlign: "right" }}>
                      <span className="muted" style={{ fontSize: "0.74rem", display: "block" }}>Skor Anda</span>
                      <strong style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}>{att.score ?? "—"}</strong>
                    </div>

                    <Link
                      href={`/results/${att.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      Lihat Hasil & Analisis <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
  );
}
