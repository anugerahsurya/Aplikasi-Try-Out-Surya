"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Trophy,
  BellOff,
  X,
  Trash2,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time?: string;
  created_at?: string;
  type: "announcement" | "exam" | "security" | "leaderboard" | string;
  isRead?: boolean;
}

const DEFAULT_FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "default-1",
    title: "Simulasi Ujian SKD 2026 Dibuka",
    message: "Paket Try Out SKD & Psikotes Kedinasan 2026 telah aktif. Kerjakan simulasi untuk menguji kesiapan Anda.",
    time: "Baru saja",
    type: "exam",
    isRead: false,
  },
  {
    id: "default-2",
    title: "Fitur Leaderboard & Reset Ujian Aktif",
    message: "Peringkat nilai dan unduh format Excel kini tersedia secara real-time untuk seluruh sesi ujian.",
    time: "1 jam lalu",
    type: "leaderboard",
    isRead: false,
  },
];

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load from API and localStorage
  useEffect(() => {
    // Load read status from localStorage
    try {
      const stored = localStorage.getItem("read_notification_ids");
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }

    // Fetch announcements from API
    async function fetchAnnouncements() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data.announcements && data.announcements.length > 0) {
            setNotifications(data.announcements);
            return;
          }
        }
      } catch {
        // fallback
      } finally {
        setIsLoading(false);
      }
      // If no DB announcements, use default
      setNotifications(DEFAULT_FALLBACK_NOTIFICATIONS);
    }

    fetchAnnouncements();
  }, []);

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

  const unreadCount = notifications.filter(
    (n) => !n.isRead && !readIds.has(n.id)
  ).length;

  const markAllAsRead = () => {
    const allIds = new Set([...readIds, ...notifications.map((n) => n.id)]);
    setReadIds(allIds);
    try {
      localStorage.setItem("read_notification_ids", JSON.stringify(Array.from(allIds)));
    } catch {
      // ignore
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
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
        return <Sparkles size={16} color="var(--brand-accent)" />;
    }
  };

  const formatTimestamp = (n: NotificationItem) => {
    if (n.time) return n.time;
    if (n.created_at) {
      const diffMs = Date.now() - new Date(n.created_at).getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      if (diffHours < 1) return "Baru saja";
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    }
    return "Baru saja";
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm"
        title="Notifikasi & Pengumuman"
        aria-label="Pusat Notifikasi"
        style={{
          position: "relative",
          padding: 8,
          color: isOpen ? "var(--brand-accent)" : "var(--text-secondary)",
          borderRadius: "var(--radius-pill)",
          background: isOpen ? "var(--brand-light)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              minWidth: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 0 2px var(--bg-surface), 0 0 8px rgba(239, 68, 68, 0.8)",
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
            width: 350,
            maxWidth: "calc(100vw - 20px)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 20px 45px -8px rgba(15, 23, 42, 0.28), 0 0 1px 1px rgba(255, 255, 255, 0.12)",
            zIndex: 999999,
            overflow: "hidden",
            boxSizing: "border-box",
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
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Bell size={16} color="var(--brand-accent)" />
              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                Notifikasi
              </strong>
              {unreadCount > 0 ? (
                <span className="badge badge-navy" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                  {unreadCount} baru
                </span>
              ) : (
                <span className="badge badge-neutral" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                  0 baru
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  title="Tandai semua dibaca"
                >
                  <CheckCheck size={13} /> Baca Semua
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  style={{
                    background: "transparent",
                    border: 0,
                    fontSize: "0.76rem",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                  title="Bersihkan daftar"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List of Notifications or Empty State */}
          <div style={{ maxHeight: 360, overflowY: "auto", padding: "4px 0" }}>
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const isRead = n.isRead || readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isRead ? "transparent" : "var(--brand-light)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
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
                        {!isRead && (
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
                        {formatTimestamp(n)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Explicit Empty State when no notifications exist */
              <div
                style={{
                  padding: "36px 20px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "var(--bg-surface-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  <BellOff size={22} style={{ opacity: 0.6 }} />
                </div>
                <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", margin: 0 }}>
                  Tidak ada notifikasi baru
                </strong>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 220, lineHeight: 1.4 }}>
                  Semua pengumuman, jadwal ujian, dan update sistem akan ditampilkan di sini.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg-surface-secondary)",
              borderTop: "1px solid var(--border-color)",
              textAlign: "center",
              fontSize: "0.74rem",
              color: "var(--text-muted)",
            }}
          >
            Pusat Notifikasi & Informasi Sistem
          </div>
        </div>
      )}
    </div>
  );
}
