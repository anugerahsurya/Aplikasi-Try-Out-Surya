"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, UserRound, Shield, LogOut } from "lucide-react";
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
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/dashboard" style={{ display: "inline-flex", textDecoration: "none" }}>
            <Logo size="md" />
          </Link>

          <nav className="desktop-nav" aria-label="Navigasi Desktop">
            <Link
              href="/dashboard"
              className={pathname === "/dashboard" ? "active" : ""}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className={pathname.startsWith("/exams") ? "active" : ""}
            >
              Ujian
            </Link>
            <Link
              href="/profile"
              className={pathname === "/profile" ? "active" : ""}
            >
              Profil
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className={pathname.startsWith("/admin") ? "active" : ""}
                style={{ color: "var(--brand-accent)", fontWeight: 700 }}
              >
                <Shield size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Admin Panel
              </Link>
            )}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThemeToggle />

            {userEmail && (
              <div className="nav-user-pill">
                <UserRound size={14} color="var(--brand-accent)" />
                <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                  {userName || userEmail}
                </span>
                {isAdmin && <span className="badge badge-navy" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>Admin</span>}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="btn btn-ghost btn-sm"
              title="Keluar dari akun"
              style={{ padding: 6, color: "var(--text-muted)" }}
            >
              <LogOut size={16} />
            </button>

            {/* Hidden form for server-side signout action */}
            <form id="signout-form" action="/auth/signout" method="post" style={{ display: "none" }} />
          </div>
        </div>
      </header>

      <main className="shell desktop-density">{children}</main>

      {/* Floating Bottom Navigation for Mobile (Ref Image 2 Style) */}
      <nav className="bottom-nav" aria-label="Navigasi Mobile">
        <Link
          href="/dashboard"
          className={pathname === "/dashboard" ? "active" : ""}
        >
          <House size={18} />
          <span>Beranda</span>
        </Link>
        <Link
          href="/dashboard"
          className={pathname.startsWith("/exams") ? "active" : ""}
        >
          <ClipboardList size={18} />
          <span>Ujian</span>
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
    </>
  );
}
