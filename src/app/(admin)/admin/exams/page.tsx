import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PlusCircle, Clock, FileText, Settings, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Exam } from "@/types";

export default async function AdminExamsPage() {
  const { supabase, user, profile } = await requireAdmin();

  const { data: exams } = await supabase
    .from("exams")
    .select("*, questions(id), exam_assignments(id)")
    .order("created_at", { ascending: false });

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "admin"}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <span className="eyebrow">Bank & Manajemen Ujian</span>
            <h1 style={{ fontSize: "1.85rem", margin: "4px 0" }}>Daftar Ujian Try Out</h1>
            <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
              Kelola struktur ujian, bank soal, skema penilaian, dan aturan keamanan
            </p>
          </div>

          <Link href="/admin/exams/new" className="btn btn-primary">
            <PlusCircle size={16} /> Buat Ujian Baru
          </Link>
        </div>

        <div className="grid grid-3">
          {exams && exams.length > 0 ? (
            exams.map((exam: any) => {
              const qCount = exam.questions?.length || 0;
              const aCount = exam.exam_assignments?.length || 0;

              return (
                <div key={exam.id} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span
                        className={`badge ${
                          exam.status === "published"
                            ? "badge-success"
                            : exam.status === "draft"
                            ? "badge-warning"
                            : "badge-neutral"
                        }`}
                      >
                        {exam.status.toUpperCase()}
                      </span>
                      <span className="muted" style={{ fontSize: "0.82rem" }}>
                        <Clock size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {exam.duration_minutes}m
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.2rem", margin: "0 0 8px" }}>{exam.title}</h3>
                    <p
                      className="muted"
                      style={{
                        fontSize: "0.88rem",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginBottom: 16,
                      }}
                    >
                      {exam.description || "Tidak ada deskripsi."}
                    </p>

                    <div style={{ display: "flex", gap: 12, fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                      <span><strong>{qCount}</strong> Soal</span>
                      <span>•</span>
                      <span><strong>{aCount}</strong> Peserta Di-assign</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                    <Link
                      href={`/admin/exams/${exam.id}/questions`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <FileText size={14} /> Kelola Soal
                    </Link>
                    <Link
                      href={`/admin/exams/${exam.id}`}
                      className="btn btn-outline btn-sm"
                      title="Pengaturan Ujian"
                    >
                      <Settings size={14} />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card" style={{ gridColumn: "1 / -1", padding: 48, textAlign: "center" }}>
              <p className="muted" style={{ marginBottom: 16 }}>Belum ada ujian yang dibuat.</p>
              <Link href="/admin/exams/new" className="btn btn-primary">
                <PlusCircle size={16} /> Buat Ujian Pertama
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
