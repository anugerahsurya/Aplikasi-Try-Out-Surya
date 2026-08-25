"use client";

import { useState, useMemo } from "react";
import {
  UserPlus,
  Mail,
  Check,
  Loader2,
  BookOpen,
  Search,
  Users,
  Clock,
  Phone,
  Building,
} from "lucide-react";
import { Profile, Exam } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ParticipantManagerProps {
  participants: (Profile & { assignments?: { id: string; exam_id: string; exam: { title: string } }[] })[];
  exams: Exam[];
}

function formatLastOnline(lastSeen?: string | null): { text: string; isOnline: boolean } {
  if (!lastSeen) {
    return { text: "Belum login", isOnline: false };
  }

  const now = new Date().getTime();
  const seenTime = new Date(lastSeen).getTime();
  const diffMs = now - seenTime;

  // Online if within 1 hour (3,600,000 ms)
  if (diffMs < 3600000 && diffMs >= 0) {
    return { text: "Online", isOnline: true };
  }

  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) {
    return { text: `${Math.max(1, diffHours)} jam lalu`, isOnline: false };
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return { text: "1 hari lalu", isOnline: false };
  }
  if (diffDays < 7) {
    return { text: `${diffDays} hari lalu`, isOnline: false };
  }

  return {
    text: new Date(lastSeen).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    isOnline: false,
  };
}

export function ParticipantManager({ participants, exams }: ParticipantManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "participant" | "admin">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Profile | null>(null);
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [targetSendCreds, setTargetSendCreds] = useState<Profile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    id: string;
    email: string;
    full_name: string;
    temporary_password?: string;
  } | null>(null);

  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchQuery =
        !searchQuery ||
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.institution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery);

      const matchRole =
        roleFilter === "all"
          ? true
          : roleFilter === "participant"
          ? p.role === "participant"
          : p.role === "admin" || p.role === "super_admin";

      return matchQuery && matchRole;
    });
  }, [participants, searchQuery, roleFilter]);

  // Handle Add Participant Form Submit
  const handleAddParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      institution: formData.get("institution"),
      send_email: formData.get("send_email") === "on",
    };

    try {
      const res = await fetch("/api/admin/users/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedUser(data.user);
        setShowAddModal(false);
        setActionMessage({
          type: "success",
          text: `Akun untuk ${data.user.full_name} berhasil dibuat! ${
            data.email_status?.sent
              ? "Kredensial telah dikirim via email."
              : "Salin password sementara di bawah jika belum terkirim via SMTP."
          }`,
        });
      } else {
        setActionMessage({ type: "error", text: data.error || "Gagal membuat peserta." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send Credentials Email
  const handleConfirmSendCredentials = async () => {
    if (!targetSendCreds) return;
    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${targetSendCreds.id}/send-credentials`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        if (data.smtp_configured && data.success) {
          setActionMessage({ type: "success", text: data.message });
        } else if (data.reset_link) {
          navigator.clipboard.writeText(data.reset_link);
          setActionMessage({
            type: "success",
            text: `Tautan reset password berhasil disalin ke clipboard: ${data.reset_link}`,
          });
        }
      } else {
        setActionMessage({ type: "error", text: data.error || "Gagal mengirim kredensial." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Terjadi kesalahan koneksi." });
    } finally {
      setIsSubmitting(false);
      setTargetSendCreds(null);
    }
  };

  // Handle Assign Exam
  const handleAssignExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showAssignModal) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const examId = formData.get("exam_id") as string;
    const attemptLimit = parseInt(formData.get("attempt_limit") as string, 10) || 1;
    const extraTime = parseInt(formData.get("extra_time_minutes") as string, 10) || 0;

    try {
      const res = await fetch("/api/admin/assignments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: showAssignModal.id,
          exam_id: examId,
          attempt_limit: attemptLimit,
          extra_time_minutes: extraTime,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAssignModal(null);
        setActionMessage({
          type: "success",
          text: `Ujian berhasil ditugaskan kepada ${showAssignModal.full_name}.`,
        });
        window.location.reload();
      } else {
        setActionMessage({ type: "error", text: data.error || "Gagal menugaskan ujian." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Gagal menugaskan ujian." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Batch Assign Exam
  const handleBatchAssignExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const examId = formData.get("exam_id") as string;
    const attemptLimit = parseInt(formData.get("attempt_limit") as string, 10) || 1;
    const extraTime = parseInt(formData.get("extra_time_minutes") as string, 10) || 0;

    const targetUserIds = filteredParticipants
      .filter((p) => p.role === "participant")
      .map((p) => p.id);

    if (targetUserIds.length === 0) {
      setActionMessage({ type: "error", text: "Tidak ada peserta yang terpilih untuk ditugaskan." });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/assignments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          user_ids: targetUserIds,
          attempt_limit: attemptLimit,
          extra_time_minutes: extraTime,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowBatchAssignModal(false);
        setActionMessage({
          type: "success",
          text: data.message || `Ujian berhasil ditugaskan ke ${targetUserIds.length} peserta.`,
        });
        window.location.reload();
      } else {
        setActionMessage({ type: "error", text: data.error || "Gagal menugaskan ujian massal." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Gagal menugaskan ujian massal." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Banner Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Daftar Akun Peserta ({participants.length})</h2>
          <p className="muted" style={{ fontSize: "0.86rem", margin: "3px 0 0" }}>
            Kelola akun siswa, pantau status online, penugasan ujian, dan kredensial login.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {exams.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBatchAssignModal(true)}
              className="btn btn-outline"
              title="Tugaskan ujian ke seluruh peserta sekaligus"
            >
              <Users size={16} /> + Assign Semua Peserta
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <UserPlus size={16} /> Tambah Peserta Baru
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            marginBottom: 18,
            fontSize: "0.88rem",
            fontWeight: 600,
            background: actionMessage.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
            color: actionMessage.type === "success" ? "var(--success)" : "var(--danger)",
            border: `1px solid ${actionMessage.type === "success" ? "var(--success-border)" : "var(--danger-border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: "transparent", border: 0, cursor: "pointer", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "6px 12px",
            flex: 1,
            minWidth: 220,
            gap: 8,
          }}
        >
          <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Cari nama, email, atau institusi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: 0,
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "0.88rem",
              width: "100%",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-muted)" }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={`btn btn-sm ${roleFilter === "all" ? "btn-primary" : "btn-outline"}`}
          >
            Semua ({participants.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("participant")}
            className={`btn btn-sm ${roleFilter === "participant" ? "btn-primary" : "btn-outline"}`}
          >
            Peserta
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("admin")}
            className={`btn btn-sm ${roleFilter === "admin" ? "btn-primary" : "btn-outline"}`}
          >
            Admin
          </button>
        </div>
      </div>

      {/* Newly Created User Info Card */}
      {createdUser && (
        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 20,
            background: "var(--success-bg)",
            border: "1px solid var(--success-border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: 6 }}>
                Akun Baru Dibuat
              </span>
              <h4 style={{ margin: "2px 0" }}>{createdUser.full_name} ({createdUser.email})</h4>
              {createdUser.temporary_password && (
                <div style={{ marginTop: 6, fontSize: "0.88rem" }}>
                  <span className="muted">Password Sementara:</span>{" "}
                  <code style={{ background: "var(--bg-surface-secondary)", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                    {createdUser.temporary_password}
                  </code>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreatedUser(null)}
              className="btn btn-ghost btn-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="table-container desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama & Email</th>
              <th>No HP & Institusi</th>
              <th>Role</th>
              <th>Terakhir Online</th>
              <th>Ujian Ditugaskan</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((p) => {
                const assignedExamsCount = p.assignments?.length || 0;
                const onlineStatus = formatLastOnline(p.last_sign_in_at || (p as any).updated_at);

                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ display: "block", color: "var(--text-primary)" }}>{p.full_name || "Tanpa Nama"}</strong>
                      <span className="muted" style={{ fontSize: "0.82rem" }}>{p.email}</span>
                    </td>
                    <td>
                      <div>{p.phone || "—"}</div>
                      <span className="muted" style={{ fontSize: "0.82rem" }}>{p.institution || "Umum"}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.role === "admin" || p.role === "super_admin"
                            ? "badge-navy"
                            : "badge-neutral"
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td>
                      {onlineStatus.isOnline ? (
                        <span
                          className="badge badge-success"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.74rem" }}
                        >
                          <span className="live-pulse-dot" /> Online
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} style={{ opacity: 0.6 }} /> {onlineStatus.text}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-navy">
                        <BookOpen size={12} /> {assignedExamsCount} Ujian
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setShowAssignModal(p)}
                          className="btn btn-primary btn-sm"
                        >
                          + Assign Ujian
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetSendCreds(p)}
                          disabled={isSubmitting}
                          className="btn btn-outline btn-sm"
                          title="Kirim kredensial/reset password via SMTP"
                        >
                          <Mail size={13} /> Kirim Kredensial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32 }} className="muted">
                  {searchQuery ? "Tidak ditemukan peserta yang sesuai pencarian." : "Belum ada peserta terdaftar."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-Based Responsive View (Zero Horizontal Scroll & No Large Bottom Gap) */}
      <div className="mobile-only" style={{ display: "grid", gap: 12, marginTop: 10 }}>
        {filteredParticipants.length > 0 ? (
          filteredParticipants.map((p) => {
            const assignedExamsCount = p.assignments?.length || 0;
            const onlineStatus = formatLastOnline(p.last_sign_in_at || (p as any).updated_at);

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem", display: "block" }}>{p.full_name || "Tanpa Nama"}</strong>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>{p.email}</span>
                  </div>
                  <span
                    className={`badge ${
                      p.role === "admin" || p.role === "super_admin"
                        ? "badge-navy"
                        : "badge-neutral"
                    }`}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {p.role}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Building size={12} className="muted" />
                    <span>{p.institution || "Umum"}</span>
                  </div>
                  {p.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Phone size={12} className="muted" />
                      <span>{p.phone}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {onlineStatus.isOnline ? (
                      <span
                        className="badge badge-success"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.7rem", padding: "2px 6px" }}
                      >
                        <span className="live-pulse-dot" /> Online
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: "0.76rem" }}>
                        {onlineStatus.text}
                      </span>
                    )}
                    <span className="badge badge-navy" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                      <BookOpen size={11} /> {assignedExamsCount} Ujian
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(p)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                    >
                      + Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetSendCreds(p)}
                      disabled={isSubmitting}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                    >
                      <Mail size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
            {searchQuery ? "Tidak ditemukan peserta yang sesuai pencarian." : "Belum ada peserta terdaftar."}
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Tambah Akun Peserta Baru</h3>
            </div>
            <form onSubmit={handleAddParticipant}>
              <div className="modal-body" style={{ display: "grid", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="m_full_name">Nama Lengkap *</label>
                  <input id="m_full_name" name="full_name" type="text" className="field" required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="m_email">Alamat Email *</label>
                  <input id="m_email" name="email" type="email" className="field" required />
                </div>

                <div className="grid grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="m_phone">No. HP / WA</label>
                    <input id="m_phone" name="phone" type="tel" className="field" placeholder="08123456789" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="m_institution">Institusi</label>
                    <input id="m_institution" name="institution" type="text" className="field" placeholder="Sekolah/Instansi" />
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem", cursor: "pointer", marginTop: 4 }}>
                  <input type="checkbox" name="send_email" defaultChecked style={{ width: 16, height: 16 }} />
                  <span>Kirim kredensial login via email SMTP</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Single Exam Modal */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Tugaskan Ujian ke Peserta</h3>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "4px 0 0" }}>
                Peserta: <strong>{showAssignModal.full_name}</strong> ({showAssignModal.email})
              </p>
            </div>
            <form onSubmit={handleAssignExam}>
              <div className="modal-body" style={{ display: "grid", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="exam_id">Pilih Ujian *</label>
                  <select id="exam_id" name="exam_id" className="field" required>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.duration_minutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="attempt_limit">Batas Pengerjaan (Attempt)</label>
                    <input id="attempt_limit" name="attempt_limit" type="number" min={1} defaultValue={1} className="field" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="extra_time_minutes">Waktu Ekstra (Menit)</label>
                    <input id="extra_time_minutes" name="extra_time_minutes" type="number" min={0} defaultValue={0} className="field" />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(null)}
                  disabled={isSubmitting}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Assign Exam to ALL Filtered Participants Modal */}
      {showBatchAssignModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Tugaskan Ujian ke Semua Peserta</h3>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "4px 0 0" }}>
                Target: <strong>{filteredParticipants.filter(p => p.role === "participant").length} peserta</strong>
              </p>
            </div>
            <form onSubmit={handleBatchAssignExam}>
              <div className="modal-body" style={{ display: "grid", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="b_exam_id">Pilih Paket Ujian *</label>
                  <select id="b_exam_id" name="exam_id" className="field" required>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.duration_minutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="b_attempt_limit">Batas Attempt Tiap Peserta</label>
                    <input id="b_attempt_limit" name="attempt_limit" type="number" min={1} defaultValue={1} className="field" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="b_extra_time_minutes">Waktu Ekstra (Menit)</label>
                    <input id="b_extra_time_minutes" name="extra_time_minutes" type="number" min={0} defaultValue={0} className="field" />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowBatchAssignModal(false)}
                  disabled={isSubmitting}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Tugaskan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive ConfirmDialog for Sending Credentials */}
      <ConfirmDialog
        isOpen={!!targetSendCreds}
        title="Kirim Kredensial via Email?"
        description={`Apakah Anda ingin mengirimkan email berisi instruksi login / reset password ke alamat ${targetSendCreds?.email}?`}
        confirmText="Ya, Kirim Email"
        cancelText="Batal"
        variant="primary"
        isLoading={isSubmitting}
        onConfirm={handleConfirmSendCredentials}
        onClose={() => setTargetSendCreds(null)}
      />
    </div>
  );
}
