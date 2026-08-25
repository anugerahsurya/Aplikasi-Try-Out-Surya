"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Sparkles, BookOpen, ShieldCheck, Trophy, Info, X } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "announcement" | "exam" | "security" | "leaderboard";
  isRead: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Simulasi Ujian SKD 2026 Dibuka",
    message: "Paket Try Out SKD & Psikotes Kedinasan 2026 telah aktif. Kerjakan simulasi untuk menguji kesiapan Anda.",
    time: "Baru saja",
    type: "exam",
    isRead: false,
  },
  {
    id: "notif-2",
    title: "Fitur Leaderboard & Reset Ujian Aktif",
    message: "Peringkat nilai dan unduh format Excel kini tersedia secara real-time untuk seluruh sesi ujian.",
    time: "1 jam lalu",
    type: "leaderboard",
    isRead: false,
  },
  {
    id: "notif-3",
    title: "Proctoring & Audit Keamanan",
    message: "Mode layar penuh dan deteksi perpindahan tab aktif untuk menjaga integritas ujian.",
    time: "Hari ini",
    type: "security",
    isRead: true,
  },
];

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "exam":
        return <BookOpen size={16} color="var(--brand-accent)" />;
      case "leaderboard":
        return <Trophy size={16} color="#d97706" />;
      case "security":
        return <ShieldCheck size={16} color="#10b981" />;
      default:
        return <Sparkles size={16} color="var(--brand-accent)" />;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm"
        title="Notifikasi & Pengumuman"
        style={{
          position: "relative",
          padding: 7,
          color: isOpen ? "var(--brand-accent)" : "var(--text-secondary)",
          borderRadius: "var(--radius-pill)",
          background: isOpen ? "var(--brand-light)" : "transparent",
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 0 2px var(--bg-surface), 0 0 8px rgba(239, 68, 68, 0.7)",
            }}
          />
        )}
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxWidth: "calc(100vw - 24px)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 18px 40px -8px rgba(15, 23, 42, 0.22), 0 0 1px 1px rgba(255, 255, 255, 0.1)",
            zIndex: 999999,
            overflow: "hidden",
            animation: "modalIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-surface-secondary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={15} color="var(--brand-accent)" />
              <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>
                Notifikasi
              </strong>
              {unreadCount > 0 && (
                <span className="badge badge-navy" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: "0.76rem",
                  color: "var(--brand-accent)",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                }}
              >
                <CheckCheck size={13} /> Tandai Dibaca
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--border-subtle)",
                  background: n.isRead ? "transparent" : "var(--brand-light)",
                  transition: "background 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {getIcon(n.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
                    <strong style={{ fontSize: "0.86rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {n.title}
                    </strong>
                    {!n.isRead && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--brand-accent)",
                          flexShrink: 0,
                          marginTop: 5,
                        }}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.45,
                    }}
                  >
                    {n.message}
                  </p>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      display: "block",
                      marginTop: 4,
                    }}
                  >
                    {n.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg-surface-secondary)",
              borderTop: "1px solid var(--border-color)",
              textAlign: "center",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            Pusat Informasi & Pengumuman Try Out Yuk
          </div>
        </div>
      )}
    </div>
  );
}
