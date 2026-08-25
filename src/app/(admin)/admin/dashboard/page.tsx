import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import {
  Shield,
  FileText,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  PlusCircle,
  ArrowRight,
  ExternalLink,
  Activity,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default async function AdminDashboard() {
  const { supabase, user, profile } = await requireAdmin();

  // Parallel Metrics & Recent Attempts Fetching
  const [
    { count: examCount },
    { count: participantCount },
    { count: activeAttemptCount },
    { count: violationCount },
    { data: recentAttempts },
  ] = await Promise.all([
    supabase.from("exams").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "participant"),
    supabase.from("attempts").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase
      .from("attempt_events")
      .select("*", { count: "exact", head: true })
      .in("event_type", ["tab_hidden", "fullscreen_exit", "window_blur", "clipboard_attempt"]),
    supabase
      .from("attempts")
      .select("*, exam:exams(title), profile:profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "admin"}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header Title Section */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="eyebrow">
                Administrator Control Panel
              </span>
              <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
                v2.4 Pro
              </span>
            </div>
            <h1 style={{ fontSize: "1.75rem", margin: "2px 0 4px", fontWeight: 800 }}>
              Ringkasan Operasional
            </h1>
            <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
              Pantau ujian aktif, peserta terdaftar, pengawasan browser, dan analisis hasil secara terpadu.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin/exams/new" className="btn btn-primary btn-md">
              <PlusCircle size={16} /> Buat Ujian Baru
            </Link>
            <Link href="/admin/participants" className="btn btn-outline btn-md">
              <Users size={16} /> Kelola Peserta
            </Link>
          </div>
        </div>

        {/* 4 Crafted & Tactile Stat Cards */}
        <div className="grid grid-4" style={{ marginBottom: 28 }}>
          {/* Card 1: Bank Ujian */}
          <div
            className="stat-card-crafted"
            style={{
              borderTop: "3px solid #2563eb",
              background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-secondary) 100%)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div
                  className="stat-icon-box"
                  style={{
                    background: "rgba(37, 99, 235, 0.1)",
                    color: "#2563eb",
                    border: "1px solid rgba(37, 99, 235, 0.2)",
                  }}
                >
                  <FileText size={18} />
                </div>
                <span className="badge badge-navy" style={{ fontSize: "0.7rem" }}>
                  Paket Soal
                </span>
              </div>
              <span className="muted" style={{ fontSize: "0.82rem", fontWeight: 600, display: "block" }}>
                Total Bank Ujian
              </span>
              <div className="stat-card-number">{examCount ?? 0}</div>
              <p className="muted" style={{ fontSize: "0.78rem", margin: "2px 0 10px" }}>
                Paket simulasi terkonfigurasi
              </p>
            </div>
            <Link
              href="/admin/exams"
              style={{
                fontSize: "0.8rem",
                color: "var(--brand-accent)",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 8,
              }}
            >
              Kelola bank soal <ArrowRight size={12} />
            </Link>
          </div>

          {/* Card 2: Peserta Terdaftar */}
          <div
            className="stat-card-crafted"
            style={{
              borderTop: "3px solid #10b981",
              background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-secondary) 100%)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div
                  className="stat-icon-box"
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <Users size={18} />
                </div>
                <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                  Terdaftar
                </span>
              </div>
              <span className="muted" style={{ fontSize: "0.82rem", fontWeight: 600, display: "block" }}>
                Peserta Terdaftar
              </span>
              <div className="stat-card-number">{participantCount ?? 0}</div>
              <p className="muted" style={{ fontSize: "0.78rem", margin: "2px 0 10px" }}>
                Siswa dengan akun aktif
              </p>
            </div>
            <Link
              href="/admin/participants"
              style={{
                fontSize: "0.8rem",
                color: "#10b981",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 8,
              }}
            >
              Manajemen peserta <ArrowRight size={12} />
            </Link>
          </div>

          {/* Card 3: Ujian Berjalan (Live) */}
          <div
            className="stat-card-crafted"
            style={{
              borderTop: "3px solid #0284c7",
              background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-secondary) 100%)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div
                  className="stat-icon-box"
                  style={{
                    background: "rgba(2, 132, 199, 0.1)",
                    color: "#0284c7",
                    border: "1px solid rgba(2, 132, 199, 0.2)",
                  }}
                >
                  <Activity size={18} />
                </div>
                <span
                  className="badge badge-info"
                  style={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <span className="live-pulse-dot" /> Live
                </span>
              </div>
              <span className="muted" style={{ fontSize: "0.82rem", fontWeight: 600, display: "block" }}>
                Sesi Live Berjalan
              </span>
              <div className="stat-card-number" style={{ color: "var(--brand-accent)" }}>
                {activeAttemptCount ?? 0}
              </div>
              <p className="muted" style={{ fontSize: "0.78rem", margin: "2px 0 10px" }}>
                {activeAttemptCount && activeAttemptCount > 0 ? "Peserta sedang mengerjakan" : "Tidak ada sesi aktif"}
              </p>
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 8,
              }}
            >
              Real-time monitoring
            </span>
          </div>

          {/* Card 4: Event Pengawasan & Keamanan */}
          <div
            className="stat-card-crafted"
            style={{
              borderTop: `3px solid ${violationCount && violationCount > 0 ? "#ef4444" : "#10b981"}`,
              background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-secondary) 100%)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div
                  className="stat-icon-box"
                  style={{
                    background: violationCount && violationCount > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                    color: violationCount && violationCount > 0 ? "#ef4444" : "#10b981",
                    border: `1px solid ${violationCount && violationCount > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}`,
                  }}
                >
                  {violationCount && violationCount > 0 ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
                </div>
                <span
                  className={`badge ${violationCount && violationCount > 0 ? "badge-danger" : "badge-success"}`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {violationCount && violationCount > 0 ? "Insiden" : "Integritas 100%"}
                </span>
              </div>
              <span className="muted" style={{ fontSize: "0.82rem", fontWeight: 600, display: "block" }}>
                Log Audit Keamanan
              </span>
              <div
                className="stat-card-number"
                style={{ color: violationCount && violationCount > 0 ? "var(--danger)" : "#10b981" }}
              >
                {violationCount ?? 0}
              </div>
              <p className="muted" style={{ fontSize: "0.78rem", margin: "2px 0 10px" }}>
                {violationCount && violationCount > 0 ? "Pelanggaran fokus/tab" : "Seluruh sesi berjalan aman"}
              </p>
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 8,
              }}
            >
              Anti-Cheat Engine Aktif
            </span>
          </div>
        </div>

        {/* Recent Attempts Table Card */}
        <section className="card" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.12rem", margin: "0 0 2px" }}>Aktivitas Pengerjaan Ujian Terbaru</h3>
              <p className="muted" style={{ fontSize: "0.84rem", margin: 0 }}>
                Pantau langsung peserta yang baru memulai, menyelesaikan, atau diaudit keamanannya.
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peserta</th>
                  <th>Paket Ujian</th>
                  <th>Waktu Sesi</th>
                  <th>Status</th>
                  <th>Skor Akhir</th>
                  <th>Log Audit</th>
                  <th style={{ textAlign: "right" }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts && recentAttempts.length > 0 ? (
                  recentAttempts.map((att: any) => (
                    <tr key={att.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "var(--radius-pill)",
                              background: "var(--brand-light)",
                              color: "var(--brand-accent)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              flexShrink: 0,
                            }}
                          >
                            {(att.profile?.full_name || "P").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ display: "block", fontSize: "0.88rem" }}>
                              {att.profile?.full_name || "Peserta"}
                            </strong>
                            <span className="muted" style={{ fontSize: "0.78rem" }}>
                              {att.profile?.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: "0.86rem" }}>
                          {att.exam?.title || "Ujian"}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: "0.82rem" }}>
                        {new Date(att.started_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        {att.status === "in_progress" && (
                          <span className="badge badge-warning">
                            <Clock size={11} /> Berjalan
                          </span>
                        )}
                        {att.status === "submitted" && (
                          <span className="badge badge-success">
                            <CheckCircle size={11} /> Selesai
                          </span>
                        )}
                        {att.status === "expired" && (
                          <span className="badge badge-danger">Waktu Habis</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)", fontSize: "0.92rem" }}>
                          {att.score !== null && att.score !== undefined ? att.score : "—"}
                        </strong>
                      </td>
                      <td>
                        {att.violation_count > 0 ? (
                          <span className="badge badge-danger">
                            <AlertTriangle size={11} /> {att.violation_count}x Pelanggaran
                          </span>
                        ) : (
                          <span className="badge badge-success">0 (Aman)</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/attempts/${att.id}`}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: "0.78rem" }}
                        >
                          <ExternalLink size={12} /> Audit Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 36 }} className="muted">
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <Activity size={24} style={{ opacity: 0.4 }} />
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Belum ada sesi ujian yang berjalan</span>
                        <span style={{ fontSize: "0.8rem" }}>Sesi pengerjaan peserta akan muncul otomatis di sini</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
