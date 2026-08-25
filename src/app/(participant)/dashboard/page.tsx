import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Clock, Play, CheckCircle2, AlertCircle, ArrowRight, ShieldAlert, Award } from "lucide-react";
import { Exam, Attempt, ExamAssignment, Profile } from "@/types";

export default async function ParticipantDashboard() {
  const { supabase, user } = await requireUser();

  // Fetch participant profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch active attempt (in_progress)
  const { data: activeAttempts } = await supabase
    .from("attempts")
    .select("*, exam:exams(*)")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false });

  const activeAttempt = activeAttempts?.[0] as (Attempt & { exam: Exam }) | undefined;

  // Fetch exam assignments
  const { data: assignments } = await supabase
    .from("exam_assignments")
    .select("*, exam:exams(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  // Fetch past submitted attempts
  const { data: completedAttempts } = await supabase
    .from("attempts")
    .select("*, exam:exams(*)")
    .eq("user_id", user.id)
    .in("status", ["submitted", "expired"])
    .order("submitted_at", { ascending: false });

  const assignedExams = (assignments || []).map((a: any) => a.exam).filter(Boolean) as Exam[];

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "participant"}
    >
      {/* Welcome Banner */}
      <section
        className="card-navy"
        style={{
          padding: "32px 28px",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <span className="eyebrow" style={{ color: "#93c5fd" }}>
            Portal Peserta Ujian
          </span>
          <h1 style={{ fontSize: "1.85rem", margin: "6px 0 10px" }}>
            Selamat Datang, {profile?.full_name || user.email?.split("@")[0]}!
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: "0.98rem", margin: 0 }}>
            Pastikan koneksi internet stabil dan siapkan diri Anda sebelum memulai sesi Try Out.
          </p>
        </div>
      </section>

      {/* Active Attempt Banner (If currently taking an exam) */}
      {activeAttempt && (
        <section
          className="card"
          style={{
            padding: 24,
            marginBottom: 32,
            borderLeft: "6px solid var(--brand-accent)",
            background: "linear-gradient(to right, var(--brand-light), var(--bg-surface))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <span className="badge badge-warning" style={{ marginBottom: 8 }}>
                <Clock size={14} /> Sedang Berlangsung
              </span>
              <h3 style={{ margin: "4px 0 6px" }}>{activeAttempt.exam?.title || "Sesi Ujian Aktif"}</h3>
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                Batas waktu penyelesaian:{" "}
                <strong>{new Date(activeAttempt.deadline_at).toLocaleTimeString("id-ID")}</strong>
              </p>
            </div>
            <Link
              href={`/tryout/${activeAttempt.id}`}
              className="btn btn-accent btn-lg"
              style={{ fontWeight: 700 }}
            >
              Lanjutkan Pengerjaan <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      {/* Assigned Exams List */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: "1.35rem" }}>Ujian yang Ditugaskan</h2>
            <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
              Daftar ujian Try Out yang siap Anda kerjakan
            </p>
          </div>
          <span className="badge badge-navy">{assignedExams.length} Ujian</span>
        </div>

        {assignedExams.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--muted)",
              background: "var(--bg-surface-secondary)",
            }}
          >
            <AlertCircle size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <p style={{ fontWeight: 600, margin: 0 }}>Belum ada ujian yang ditugaskan untuk akun Anda.</p>
            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Hubungi pengawas atau administrator jika Anda seharusnya terdaftar dalam sesi ujian.
            </p>
          </div>
        ) : (
          <div className="grid grid-2">
            {assignedExams.map((exam) => {
              const isAttempted = completedAttempts?.some((a: any) => a.exam_id === exam.id);
              return (
                <div key={exam.id} className="card exam-card">
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <span className="badge badge-navy">
                        <Clock size={13} /> {exam.duration_minutes} Menit
                      </span>
                      {exam.security_policy?.require_fullscreen && (
                        <span className="badge badge-neutral" title="Pengawasan Layar Penuh">
                          <ShieldAlert size={13} /> Kuis Terpantau
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "1.15rem", margin: "6px 0" }}>{exam.title}</h3>
                    <p
                      className="muted"
                      style={{
                        fontSize: "0.88rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginBottom: 12,
                      }}
                    >
                      {exam.description || "Tidak ada deskripsi tambahan."}
                    </p>
                  </div>
                  <Link
                    href={`/exams/${exam.slug || exam.id}`}
                    className="btn btn-primary"
                    style={{ flexShrink: 0 }}
                  >
                    <Play size={16} /> {isAttempted ? "Ulangi / Detail" : "Mulai Ujian"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed Exam History */}
      {completedAttempts && completedAttempts.length > 0 && (
        <section>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: "1.35rem" }}>Riwayat Pengerjaan</h2>
            <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
              Hasil dan arsip ujian yang telah diselesaikan
            </p>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Judul Ujian</th>
                  <th>Waktu Selesai</th>
                  <th>Status</th>
                  <th>Skor</th>
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
                          <CheckCircle2 size={13} /> Selesai
                        </span>
                      </td>
                      <td>
                        {isReleased ? (
                          <strong style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
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
                          <Award size={14} /> Lihat Hasil
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
    </AppShell>
  );
}
