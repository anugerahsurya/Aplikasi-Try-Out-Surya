"use client";

import { useState } from "react";
import { UserPlus, Mail, KeyRound, Copy, Check, Send, Loader2, Link2, BookOpen } from "lucide-react";
import { Profile, Exam } from "@/types";

interface ParticipantManagerProps {
  participants: (Profile & { assignments?: { id: string; exam_id: string; exam: { title: string } }[] })[];
  exams: Exam[];
}

export function ParticipantManager({ participants, exams }: ParticipantManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Profile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    id: string;
    email: string;
    full_name: string;
    temporary_password?: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send Credentials Email
  const handleSendCredentials = async (participantId: string) => {
    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${participantId}/send-credentials`, {
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
    } catch (err) {
      setActionMessage({ type: "error", text: "Terjadi kesalahan koneksi." });
    } finally {
      setIsSubmitting(false);
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
    } catch (err) {
      setActionMessage({ type: "error", text: "Gagal menugaskan ujian." });
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
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.35rem" }}>Daftar Akun Peserta ({participants.length})</h2>
          <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
            Kelola data akun, penugasan sesi ujian, dan pengiriman kredensial via SMTP
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <UserPlus size={16} /> Tambah Peserta Baru
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "var(--radius-sm)",
            marginBottom: 20,
            fontSize: "0.9rem",
            fontWeight: 600,
            background: actionMessage.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
            color: actionMessage.type === "success" ? "var(--success)" : "var(--danger)",
            border: `1px solid ${actionMessage.type === "success" ? "#86efac" : "#fca5a5"}`,
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

      {/* Newly Created User Info Card */}
      {createdUser && (
        <div
          className="card"
          style={{
            padding: 20,
            marginBottom: 24,
            background: "linear-gradient(to right, #f0fdf4, #ffffff)",
            border: "1.5px solid #86efac",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: 8 }}>
                Akun Baru Dibuat
              </span>
              <h4 style={{ margin: "4px 0" }}>{createdUser.full_name} ({createdUser.email})</h4>
              {createdUser.temporary_password && (
                <div style={{ marginTop: 8, fontSize: "0.9rem" }}>
                  <span className="muted">Password Sementara:</span>{" "}
                  <code style={{ background: "#e2e8f0", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                    {createdUser.temporary_password}
                  </code>
                </div>
              )}
            </div>
            <button
              onClick={() => setCreatedUser(null)}
              className="btn btn-ghost btn-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Table of Participants */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama & Email</th>
              <th>No HP & Institusi</th>
              <th>Role</th>
              <th>Ujian Ditugaskan</th>
              <th>Aksi Kredensial & Ujian</th>
            </tr>
          </thead>
          <tbody>
            {participants.length > 0 ? (
              participants.map((p) => {
                const assignedExamsCount = p.assignments?.length || 0;

                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ display: "block", color: "var(--navy-900)" }}>{p.full_name}</strong>
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
                      <span className="badge badge-navy">
                        <BookOpen size={12} /> {assignedExamsCount} Ujian
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => setShowAssignModal(p)}
                          className="btn btn-primary btn-sm"
                        >
                          + Assign Ujian
                        </button>
                        <button
                          onClick={() => handleSendCredentials(p.id)}
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
                <td colSpan={5} style={{ textAlign: "center", padding: 32 }} className="muted">
                  Belum ada peserta terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Tambah Akun Peserta Baru</h3>
            </div>
            <form onSubmit={handleAddParticipant}>
              <div className="modal-body" style={{ display: "grid", gap: 14 }}>
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

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", cursor: "pointer", marginTop: 4 }}>
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

      {/* Assign Exam Modal */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Tugaskan Ujian ke Peserta</h3>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "4px 0 0" }}>
                Peserta: <strong>{showAssignModal.full_name}</strong> ({showAssignModal.email})
              </p>
            </div>
            <form onSubmit={handleAssignExam}>
              <div className="modal-body" style={{ display: "grid", gap: 14 }}>
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
    </div>
  );
}
