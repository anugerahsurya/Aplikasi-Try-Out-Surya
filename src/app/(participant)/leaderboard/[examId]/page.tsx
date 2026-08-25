import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Trophy, ArrowLeft, Award, Clock, Users, Target, CheckCircle2 } from "lucide-react";
import { Exam } from "@/types";

export default async function ParticipantLeaderboardPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const { supabase, user } = await requireUser();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId);

  // Fetch exam details
  let examQuery = supabase.from("exams").select("*");
  if (isUuid) {
    examQuery = examQuery.eq("id", examId);
  } else {
    examQuery = examQuery.eq("slug", examId);
  }
  const { data: exam, error: examError } = await examQuery.maybeSingle();

  if (examError || !exam) {
    notFound();
  }

  // Fetch submitted attempts ranked by score desc, then by completion duration asc
  const { data: attempts } = await supabase
    .from("attempts")
    .select("*, profile:profiles(full_name, email, institution)")
    .eq("exam_id", exam.id)
    .in("status", ["submitted", "expired"])
    .order("score", { ascending: false })
    .order("submitted_at", { ascending: true });

  const rankedAttempts = attempts || [];
  const totalFinished = rankedAttempts.length;
  const highestScore = totalFinished > 0 ? rankedAttempts[0].score ?? 0 : 0;
  const averageScore =
    totalFinished > 0
      ? Math.round(
          rankedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalFinished
        )
      : 0;

  const userRankIndex = rankedAttempts.findIndex((att) => att.user_id === user.id);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 18, paddingLeft: 0 }}
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      {/* Leaderboard Header Banner */}
      <section
        className="card-navy"
        style={{
          padding: "28px 24px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="badge badge-warning" style={{ fontSize: "0.74rem" }}>
                <Trophy size={13} /> Peringkat Nilai Peserta
              </span>
            </div>
            <h1 style={{ color: "#ffffff", fontSize: "1.75rem", margin: "4px 0 6px", fontWeight: 800 }}>
              Leaderboard: {exam.title}
            </h1>
            <p style={{ color: "#cbd5e1", fontSize: "0.88rem", margin: 0 }}>
              Daftar capaian nilai tertinggi peserta simulasi secara real-time.
            </p>
          </div>

          {userRank && (
            <div
              style={{
                padding: "10px 18px",
                borderRadius: "var(--radius-md)",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textAlign: "center",
              }}
            >
              <span style={{ color: "#93c5fd", fontSize: "0.76rem", fontWeight: 700, textTransform: "uppercase" }}>
                Posisi Anda
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff" }}>
                #{userRank} <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>/ {totalFinished}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.76rem", color: "#cbd5e1", display: "block" }}>
              Total Peserta Selesai
            </span>
            <strong style={{ fontSize: "1.2rem", color: "#ffffff" }}>
              {totalFinished} Orang
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "0.76rem", color: "#cbd5e1", display: "block" }}>
              Nilai Tertinggi
            </span>
            <strong style={{ fontSize: "1.2rem", color: "#4ade80" }}>
              {highestScore} Poin
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "0.76rem", color: "#cbd5e1", display: "block" }}>
              Rata-Rata Nilai
            </span>
            <strong style={{ fontSize: "1.2rem", color: "#60a5fa" }}>
              {averageScore} Poin
            </strong>
          </div>
        </div>
      </section>

      {/* Leaderboard Table / Cards */}
      <section className="card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.18rem", margin: 0 }}>Peringkat ({totalFinished})</h2>
        </div>

        {rankedAttempts.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {rankedAttempts.map((att: any, idx: number) => {
              const isCurrentUser = att.user_id === user.id;
              const rank = idx + 1;
              const p = att.profile || {};

              return (
                <div
                  key={att.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    background: isCurrentUser
                      ? "var(--brand-light)"
                      : "var(--bg-surface-secondary)",
                    border: isCurrentUser
                      ? "2px solid var(--brand-accent)"
                      : "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Rank Badge */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        flexShrink: 0,
                        background:
                          rank === 1
                            ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                            : rank === 2
                            ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
                            : rank === 3
                            ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                            : "var(--bg-surface)",
                        color: rank <= 3 ? "#ffffff" : "var(--text-primary)",
                        border: rank > 3 ? "1px solid var(--border-color)" : "none",
                        boxShadow: rank <= 3 ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                      }}
                    >
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: "0.96rem", color: "var(--text-primary)" }}>
                          {p.full_name || "Peserta"}
                        </strong>
                        {isCurrentUser && (
                          <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
                            Anda
                          </span>
                        )}
                      </div>
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        {p.institution || "Umum"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <span className="muted" style={{ fontSize: "0.74rem", display: "block" }}>
                        Skor
                      </span>
                      <strong style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>
                        {att.score ?? "—"}
                      </strong>
                    </div>

                    <div style={{ textAlign: "right", minWidth: 80 }} className="desktop-only">
                      <span className="muted" style={{ fontSize: "0.72rem", display: "block" }}>
                        Selesai
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {att.submitted_at
                          ? new Date(att.submitted_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
            <Users size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Belum ada peserta yang menyelesaikan simulasi ini.</p>
            <p style={{ fontSize: "0.84rem", marginTop: 4 }}>Peringkat akan muncul secara otomatis saat peserta mengumpulkan jawaban.</p>
          </div>
        )}
      </section>
    </div>
  );
}
