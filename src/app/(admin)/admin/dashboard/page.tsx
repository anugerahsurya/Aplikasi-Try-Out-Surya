import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import {
  Shield,
  FileText,
  Users,
  Clock,
  AlertTriangle,
  Mail,
  CheckCircle,
  PlusCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { isSmtpConfigured, getSmtpConfig } from "@/lib/email/email-service";

export default async function AdminDashboard() {
  const { supabase, user, profile } = await requireAdmin();

  // Metrics
  const { count: examCount } = await supabase
    .from("exams")
    .select("*", { count: "exact", head: true });

  const { count: participantCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "participant");

  const { count: activeAttemptCount } = await supabase
    .from("attempts")
    .select("*", { count: "exact", head: true })
    .eq("status", "in_progress");

  const { count: violationCount } = await supabase
    .from("attempt_events")
    .select("*", { count: "exact", head: true })
    .in("event_type", ["tab_hidden", "fullscreen_exit", "window_blur", "clipboard_attempt"]);

  // Recent attempts
  const { data: recentAttempts } = await supabase
    .from("attempts")
    .select("*, exam:exams(title), profile:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(8);

  const smtpConfig = getSmtpConfig();
  const smtpActive = isSmtpConfigured();

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "admin"}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header Title */}
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
            <span className="eyebrow" style={{ color: "var(--navy-600)" }}>
              Administrator Panel
            </span>
            <h1 style={{ fontSize: "1.85rem", margin: "4px 0" }}>Ringkasan Operasional</h1>
            <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
              Pantau ujian aktif, peserta, keamanan browser, dan konfigurasi sistem
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/admin/exams/new" className="btn btn-primary">
              <PlusCircle size={16} /> Buat Ujian Baru
            </Link>
            <Link href="/admin/participants" className="btn btn-outline">
              <Users size={16} /> Kelola Peserta
            </Link>
          </div>
        </div>

        {/* SMTP Status Notice */}
        <div
          className="card"
          style={{
            padding: "16px 20px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            background: smtpActive ? "var(--brand-light)" : "var(--warning-bg)",
            borderColor: smtpActive ? "var(--border-color)" : "var(--warning-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mail size={20} color={smtpActive ? "var(--brand-accent)" : "var(--warning)"} />
            <div>
              <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>
                Status Layanan Email (SMTP Google):
              </strong>{" "}
              <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                {smtpActive
                  ? `Aktif (${smtpConfig?.host} port ${smtpConfig?.port} via App Password)`
                  : "Password App terpasang (`ciwh afam oyfq ahpk`). Masukkan `SMTP_USER` di `.env.local` untuk mengaktifkan pengiriman."}
              </span>
            </div>
          </div>
          <span className={`badge ${smtpActive ? "badge-success" : "badge-warning"}`}>
            {smtpActive ? "Siap Kirim" : "Perlu SMTP_USER"}
          </span>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-4" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <span className="muted" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              Total Ujian
            </span>
            <div className="stat-card-number">{examCount ?? 0}</div>
            <Link
              href="/admin/exams"
              style={{
                fontSize: "0.82rem",
                color: "var(--brand-accent)",
                fontWeight: 700,
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>

          <div className="stat-card">
            <span className="muted" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              Peserta Terdaftar
            </span>
            <div className="stat-card-number">{participantCount ?? 0}</div>
            <Link
              href="/admin/participants"
              style={{
                fontSize: "0.82rem",
                color: "var(--brand-accent)",
                fontWeight: 700,
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Kelola peserta <ArrowRight size={12} />
            </Link>
          </div>

          <div className="stat-card">
            <span className="muted" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              Ujian Berjalan (Aktif)
            </span>
            <div className="stat-card-number" style={{ color: "#2563eb" }}>
              {activeAttemptCount ?? 0}
            </div>
            <span className="muted" style={{ fontSize: "0.82rem", marginTop: 8 }}>
              Sedang mengerjakan
            </span>
          </div>

          <div className="stat-card">
            <span className="muted" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              Event Pelanggaran
            </span>
            <div className="stat-card-number" style={{ color: "var(--danger)" }}>
              {violationCount ?? 0}
            </div>
            <span className="muted" style={{ fontSize: "0.82rem", marginTop: 8 }}>
              Log audit keamanan
            </span>
          </div>
        </div>

        {/* Recent Attempts Table */}
        <section className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.18rem" }}>Sesi Pengerjaan Terbaru</h3>
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Pantau pengerjaan ujian dan skor peserta
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peserta</th>
                  <th>Ujian</th>
                  <th>Mulai</th>
                  <th>Status</th>
                  <th>Skor</th>
                  <th>Pelanggaran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts && recentAttempts.length > 0 ? (
                  recentAttempts.map((att: any) => (
                    <tr key={att.id}>
                      <td>
                        <strong style={{ display: "block" }}>
                          {att.profile?.full_name || "Peserta"}
                        </strong>
                        <span className="muted" style={{ fontSize: "0.8rem" }}>
                          {att.profile?.email}
                        </span>
                      </td>
                      <td>{att.exam?.title || "Ujian"}</td>
                      <td className="muted">
                        {new Date(att.started_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        {att.status === "in_progress" && (
                          <span className="badge badge-warning">
                            <Clock size={12} /> Berjalan
                          </span>
                        )}
                        {att.status === "submitted" && (
                          <span className="badge badge-success">
                            <CheckCircle size={12} /> Selesai
                          </span>
                        )}
                        {att.status === "expired" && (
                          <span className="badge badge-danger">Waktu Habis</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>{att.score ?? "—"}</strong>
                      </td>
                      <td>
                        {att.violation_count > 0 ? (
                          <span className="badge badge-danger">
                            <AlertTriangle size={12} /> {att.violation_count} kali
                          </span>
                        ) : (
                          <span className="badge badge-success">0 (Aman)</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/attempts/${att.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          <ExternalLink size={13} /> Audit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32 }} className="muted">
                      Belum ada aktivitas pengerjaan ujian.
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
