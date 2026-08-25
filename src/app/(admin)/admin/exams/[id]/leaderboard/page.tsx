import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  Trophy,
  ArrowLeft,
  Download,
  ExternalLink,
  Users,
  Settings,
  HelpCircle,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Exam } from "@/types";

export default async function AdminExamLeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  // Fetch exam details
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*, questions(id)")
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle();

  if (examError || !exam) {
    notFound();
  }

  // Fetch submitted attempts ranked by score desc
  const { data: attempts } = await supabase
    .from("attempts")
    .select("*, profile:profiles(full_name, email, phone, institution)")
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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <Link
          href="/admin/exams"
          className="btn btn-ghost btn-sm"
          style={{ paddingLeft: 0 }}
        >
          <ArrowLeft size={16} /> Kembali ke Bank Soal
        </Link>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href={`/admin/exams/${exam.id}/questions`}
            className="btn btn-outline btn-sm"
          >
            <HelpCircle size={14} /> Kelola Butir Soal
          </Link>
          <Link
            href={`/admin/exams/${exam.id}`}
            className="btn btn-outline btn-sm"
          >
            <Settings size={14} /> Pengaturan Ujian
          </Link>
          <a
            href={`/api/admin/exams/${exam.id}/export`}
            download
            className="btn btn-primary btn-sm"
          >
            <Download size={14} /> Export Hasil (Excel)
          </a>
        </div>
      </div>

      {/* Leaderboard Header Banner */}
      <section
        className="card-navy"
        style={{
          padding: "26px 24px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="badge badge-warning" style={{ fontSize: "0.74rem" }}>
                <Trophy size={13} /> Peringkat & Evaluasi Nilai
              </span>
            </div>
            <h1 style={{ color: "#ffffff", fontSize: "1.75rem", margin: "4px 0 6px", fontWeight: 800 }}>
              {exam.title}
            </h1>
            <p style={{ color: "#cbd5e1", fontSize: "0.88rem", margin: 0 }}>
              Pantau peringkat nilai seluruh peserta dan unduh rekapitulasi data pengerjaan dalam format Excel.
            </p>
          </div>

          <a
            href={`/api/admin/exams/${exam.id}/export`}
            download
            className="btn btn-light btn-md"
            style={{ fontWeight: 700 }}
          >
            <Download size={16} /> Unduh Format Excel (.csv)
          </a>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.76rem", color: "#cbd5e1", display: "block" }}>
              Total Peserta Selesai
            </span>
            <strong style={{ fontSize: "1.25rem", color: "#ffffff" }}>
              {totalFinished} Peserta
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "0.76rem", color: "#cbd5e1", display: "block" }}>
              Skor Tertinggi
            </span>
            <strong style={{ fontSize: "1.25rem", color: "#4ade80" }}>
              {highestScore} Poin
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "0.76rem", color: "#cbd5e1", display: "block" }}>
              Rata-Rata Skor
            </span>
            <strong style={{ fontSize: "1.25rem", color: "#60a5fa" }}>
              {averageScore} Poin
            </strong>
          </div>
        </div>
      </section>

      {/* Table of Ranked Participants */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", margin: "0 0 2px" }}>Peringkat Peserta ({totalFinished})</h3>
            <p className="muted" style={{ fontSize: "0.84rem", margin: 0 }}>
              Urutan berdasarkan skor tertinggi dan kecepatan waktu pengumpulan.
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Rank</th>
                <th>Peserta</th>
                <th>Institusi / No HP</th>
                <th>Skor Akhir</th>
                <th>Waktu Selesai</th>
                <th>Audit Keamanan</th>
                <th style={{ textAlign: "right" }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rankedAttempts.length > 0 ? (
                rankedAttempts.map((att: any, idx: number) => {
                  const rank = idx + 1;
                  const p = att.profile || {};

                  return (
                    <tr key={att.id}>
                      <td>
                        <strong
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background:
                              rank === 1
                                ? "#fef3c7"
                                : rank === 2
                                ? "#f1f5f9"
                                : rank === 3
                                ? "#ffedd5"
                                : "transparent",
                            color:
                              rank === 1
                                ? "#b45309"
                                : rank === 2
                                ? "#475569"
                                : rank === 3
                                ? "#c2410c"
                                : "var(--text-secondary)",
                            fontSize: "0.85rem",
                          }}
                        >
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ display: "block", fontSize: "0.88rem" }}>
                          {p.full_name || "Tanpa Nama"}
                        </strong>
                        <span className="muted" style={{ fontSize: "0.78rem" }}>
                          {p.email}
                        </span>
                      </td>
                      <td>
                        <div>{p.institution || "Umum"}</div>
                        <span className="muted" style={{ fontSize: "0.78rem" }}>
                          {p.phone || "—"}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>
                          {att.score ?? "—"}
                        </strong>
                      </td>
                      <td className="muted" style={{ fontSize: "0.82rem" }}>
                        {att.submitted_at
                          ? new Date(att.submitted_at).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td>
                        {att.violation_count > 0 ? (
                          <span className="badge badge-danger">
                            <AlertTriangle size={11} /> {att.violation_count}x Pelanggaran
                          </span>
                        ) : (
                          <span className="badge badge-success">Aman (0)</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/attempts/${att.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          <ExternalLink size={12} /> Audit Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 36 }} className="muted">
                    <Users size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                    <div style={{ fontWeight: 600 }}>Belum ada peserta yang menyelesaikan ujian ini.</div>
                    <div style={{ fontSize: "0.82rem", marginTop: 4 }}>
                      Hasil dan peringkat akan terisi otomatis setelah peserta submit ujian.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
