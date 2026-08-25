"use client";

import { useState } from "react";
import {
  Bell,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  BookOpen,
  Trophy,
  ShieldCheck,
  Megaphone,
  CheckCircle,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  target_role: string;
  is_active: boolean;
  created_at: string;
}

interface AnnouncementManagerProps {
  initialAnnouncements: Announcement[];
}

export function AnnouncementManager({ initialAnnouncements }: AnnouncementManagerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCreateAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlertMsg(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get("title") as string,
      message: formData.get("message") as string,
      type: formData.get("type") as string,
      target_role: formData.get("target_role") as string,
    };

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setAnnouncements([data.announcement, ...announcements]);
        setShowModal(false);
        setAlertMsg({
          type: "success",
          text: "Pengumuman berhasil disiarkan dan akan tampil di lonceng notifikasi peserta!",
        });
      } else {
        setAlertMsg({ type: "error", text: data.error || "Gagal membuat pengumuman." });
      }
    } catch {
      setAlertMsg({ type: "error", text: "Terjadi kesalahan koneksi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Hapus pengumuman ini dari notifikasi peserta?")) return;

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAnnouncements(announcements.filter((a) => a.id !== id));
        setAlertMsg({ type: "success", text: "Pengumuman berhasil dihapus." });
      }
    } catch {
      setAlertMsg({ type: "error", text: "Gagal menghapus pengumuman." });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "exam":
        return <BookOpen size={16} color="var(--brand-accent)" />;
      case "leaderboard":
        return <Trophy size={16} color="#d97706" />;
      case "security":
        return <ShieldCheck size={16} color="#10b981" />;
      default:
        return <Megaphone size={16} color="var(--brand-accent)" />;
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.15rem", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={18} color="var(--brand-accent)" /> Siaran Pengumuman & Notifikasi Peserta
          </h3>
          <p className="muted" style={{ fontSize: "0.84rem", margin: "2px 0 0" }}>
            Kirim informasi, jadwal ujian baru, atau pengumuman ke seluruh lonceng notifikasi peserta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-sm"
        >
          <Plus size={15} /> Buat Pengumuman Baru
        </button>
      </div>

      {alertMsg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            marginBottom: 14,
            fontSize: "0.85rem",
            background: alertMsg.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
            color: alertMsg.type === "success" ? "var(--success)" : "var(--danger)",
            border: `1px solid ${alertMsg.type === "success" ? "var(--success-border)" : "var(--danger-border)"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{alertMsg.text}</span>
          <button
            onClick={() => setAlertMsg(null)}
            style={{ background: "transparent", border: 0, cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* List of active announcements */}
      {announcements.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {announcements.map((a) => (
            <div
              key={a.id}
              className="card"
              style={{
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--bg-surface-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {getIcon(a.type)}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>{a.title}</strong>
                    <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
                      {a.type}
                    </span>
                    <span className="muted" style={{ fontSize: "0.76rem" }}>
                      {new Date(a.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                    {a.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteAnnouncement(a.id)}
                className="btn btn-ghost btn-sm"
                title="Hapus pengumuman ini"
                style={{ color: "var(--danger)", padding: 6 }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
          Belum ada siaran pengumuman kustom yang aktif. Klik <strong>+ Buat Pengumuman Baru</strong> untuk mengirim notifikasi ke seluruh peserta.
        </div>
      )}

      {/* Modal Buat Pengumuman */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Buat Siaran Notifikasi & Pengumuman</h3>
            </div>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="modal-body" style={{ display: "grid", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="a_title">Judul Notifikasi *</label>
                  <input
                    id="a_title"
                    name="title"
                    type="text"
                    className="field"
                    placeholder="Contoh: Paket Simulasi SKD 2026 Dibuka"
                    required
                  />
                </div>

                <div className="grid grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="a_type">Kategori / Tipe *</label>
                    <select id="a_type" name="type" className="field" required>
                      <option value="announcement">📢 Pengumuman Umum</option>
                      <option value="exam">📖 Informasi Ujian / Soal</option>
                      <option value="leaderboard">🏆 Peringkat & Hasil</option>
                      <option value="security">🛡️ Keamanan & Proctoring</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="a_target">Target Penerima</label>
                    <select id="a_target" name="target_role" className="field">
                      <option value="all">Semua Pengguna</option>
                      <option value="participant">Hanya Peserta</option>
                      <option value="admin">Hanya Admin</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="a_message">Isi Pesan Notifikasi *</label>
                  <textarea
                    id="a_message"
                    name="message"
                    rows={3}
                    className="field"
                    placeholder="Tulis rincian informasi yang akan dibaca peserta saat membuka lonceng notifikasi..."
                    required
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}{" "}
                  Siarkan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
