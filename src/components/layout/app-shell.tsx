"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ClipboardList,
  UserRound,
  Shield,
  LogOut,
  Users,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import { AppRole } from "@/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: AppRole;
  userName?: string;
}

export function AppShell({ children, userEmail, userRole, userName }: AppShellProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const isInAdminSection = pathname.startsWith("/admin");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isExamActive = pathname.startsWith("/tryout/");

  if (isExamActive) {
    return <main>{children}</main>;
  }

  const handleConfirmLogout = () => {
    setIsLoggingOut(true);
    const form = document.getElementById("signout-form") as HTMLFormElement;
    if (form) {
      form.submit();
    }
  };

  return (
    <div style={{ width: "100%", overflowX: "hidden", minHeight: "100vh", position: "relative" }}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link
            href={isInAdminSection ? "/admin/dashboard" : "/dashboard"}
            style={{ display: "inline-flex", textDecoration: "none", flexShrink: 0 }}
          >
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label="Navigasi Desktop">
            {isInAdminSection ? (
              // Admin Section Navigation
              <>
                <Link
                  href="/admin/dashboard"
                  className={pathname === "/admin/dashboard" ? "active" : ""}
                >
                  Ringkasan
                </Link>
                <Link
                  href="/admin/exams"
                  className={pathname.startsWith("/admin/exams") ? "active" : ""}
                >
                  Kelola Ujian
                </Link>
                <Link
                  href="/admin/participants"
                  className={pathname === "/admin/participants" ? "active" : ""}
                >
                  Peserta
                </Link>
                <Link
                  href="/dashboard"
                  className="btn btn-outline btn-sm"
                  style={{ marginLeft: 8, fontSize: "0.8rem" }}
                  title="Lihat tampilan dashboard sebagai peserta"
                >
                  <ExternalLink size={13} /> Portal Peserta
                </Link>
              </>
            ) : (
              // Participant Section Navigation
              <>
                <Link
                  href="/dashboard"
                  className={pathname === "/dashboard" ? "active" : ""}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className={pathname === "/profile" ? "active" : ""}
                >
                  Profil Saya
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="btn btn-accent btn-sm"
                    style={{ marginLeft: 8, fontSize: "0.8rem", color: "#ffffff" }}
                  >
                    <Shield size={14} /> Ke Panel Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Controls & Theme Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <ThemeToggle />

            {userEmail && (
              <div className="nav-user-pill">
                <UserRound size={13} color="var(--brand-accent)" />
                <span
                  style={{
                    maxWidth: 110,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                  }}
                >
                  {userName || userEmail}
                </span>
                {isAdmin && (
                  <span
                    className="badge badge-navy"
                    style={{ fontSize: "0.65rem", padding: "1px 5px" }}
                  >
                    Admin
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="btn btn-ghost btn-sm"
              title="Keluar dari akun"
              style={{ padding: 6, color: "var(--text-muted)", borderRadius: "var(--radius-pill)" }}
            >
              <LogOut size={16} />
            </button>

            {/* Hidden form for server-side signout action */}
            <form id="signout-form" action="/auth/signout" method="post" style={{ display: "none" }} />
          </div>
        </div>
      </header>

      <main className="shell desktop-density">{children}</main>

      {/* Floating Bottom Navigation for Mobile (Fixed at Viewport Bottom) */}
      <nav className="bottom-nav" aria-label="Navigasi Mobile">
        {isInAdminSection ? (
          // Admin Mobile Navigation
          <>
            <Link
              href="/admin/dashboard"
              className={pathname === "/admin/dashboard" ? "active" : ""}
            >
              <LayoutDashboard size={18} />
              <span>Ringkasan</span>
            </Link>
            <Link
              href="/admin/exams"
              className={pathname.startsWith("/admin/exams") ? "active" : ""}
            >
              <ClipboardList size={18} />
              <span>Ujian</span>
            </Link>
            <Link
              href="/admin/participants"
              className={pathname === "/admin/participants" ? "active" : ""}
            >
              <Users size={18} />
              <span>Peserta</span>
            </Link>
            <Link
              href="/dashboard"
              className={pathname === "/dashboard" ? "active" : ""}
            >
              <ExternalLink size={18} />
              <span>Peserta</span>
            </Link>
          </>
        ) : (
          // Participant Mobile Navigation
          <>
            <Link
              href="/dashboard"
              className={pathname === "/dashboard" ? "active" : ""}
            >
              <House size={18} />
              <span>Beranda</span>
            </Link>
            <Link
              href="/profile"
              className={pathname === "/profile" ? "active" : ""}
            >
              <UserRound size={18} />
              <span>Profil</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className={pathname.startsWith("/admin") ? "active" : ""}
                style={{ color: "var(--brand-accent)" }}
              >
                <Shield size={18} />
                <span>Admin</span>
              </Link>
            )}
          </>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2px" }}>
          <ThemeToggle />
        </div>
      </nav>

      {/* Modern Next.js-style Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutModal}
        title="Keluar dari Akun?"
        description="Apakah Anda yakin ingin mengakhiri sesi login saat ini? Anda harus memasukkan kredensial kembali untuk mengakses akun."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        isLoading={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
