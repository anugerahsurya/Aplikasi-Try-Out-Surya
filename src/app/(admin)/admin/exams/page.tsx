import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PlusCircle, Clock, FileText, Settings, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
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
            marginBottom: 24,
          }}
        >
          <div>
            <span className="eyebrow">Bank & Manajemen Ujian</span>
            <h1 style={{ fontSize: "1.75rem", margin: "2px 0 4px", fontWeight: 800 }}>Daftar Ujian Try Out</h1>
            <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
              Kelola struktur ujian, bank soal, skema penilaian, dan penugasan peserta
            </p>
          </div>

          <Link href="/admin/exams/new" className="btn btn-primary btn-md">
            <PlusCircle size={16} /> Buat Ujian Baru
          </Link>
        </div>

        <div className="grid grid-3">
          {exams && exams.length > 0 ? (
            exams.map((exam: any) => {
              const qCount = exam.questions?.length || 0;
              const aCount = exam.exam_assignments?.length || 0;
              const isPublished = exam.status === "published";

              return (
                <div
                  key={exam.id}
                  className="stat-card-crafted"
                  style={{
                    padding: "22px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderTop: `3px solid ${isPublished ? "#10b981" : "#f59e0b"}`,
                    background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-secondary) 100%)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span
                        className={`badge ${
                          isPublished
                            ? "badge-success"
                            : exam.status === "draft"
                            ? "badge-warning"
                            : "badge-neutral"
                        }`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {exam.status.toUpperCase()}
                      </span>
                      <span className="muted" style={{ fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} color="var(--brand-accent)" /> {exam.duration_minutes} Menit
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.15rem", margin: "0 0 6px", fontWeight: 800 }}>{exam.title}</h3>
                    <p
                      className="muted"
                      style={{
                        fontSize: "0.84rem",
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginBottom: 14,
                      }}
                    >
                      {exam.description || "Tidak ada deskripsi."}
                    </p>

                    <div style={{ display: "flex", gap: 10, fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                      <span className="badge badge-neutral" style={{ fontSize: "0.74rem" }}>
                        <strong>{qCount}</strong> Butir Soal
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: "0.74rem" }}>
                        <strong>{aCount}</strong> Peserta
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
                    <Link
                      href={`/admin/exams/${exam.id}/questions`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, fontSize: "0.8rem" }}
                    >
                      <FileText size={14} /> Kelola Soal
                    </Link>
                    <Link
                      href={`/admin/exams/${exam.id}`}
                      className="btn btn-outline btn-sm"
                      title="Pengaturan Ujian"
                      style={{ padding: "6px 10px" }}
                    >
                      <Settings size={14} />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card" style={{ gridColumn: "1 / -1", padding: 48, textAlign: "center" }}>
              <p className="muted" style={{ marginBottom: 16 }}>Belum ada paket ujian yang dibuat.</p>
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
