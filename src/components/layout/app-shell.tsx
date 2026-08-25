"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, UserRound, Shield, LogOut, Asterisk } from "lucide-react";
import { AppRole } from "@/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: AppRole;
  userName?: string;
}

export function AppShell({ children, userEmail, userRole, userName }: AppShellProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const isExamActive = pathname.startsWith("/tryout/");

  if (isExamActive) {
    return <main>{children}</main>;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/dashboard">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--brand-light)",
                color: "var(--brand-accent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Asterisk size={18} strokeWidth={2.5} />
            </div>
            <span>Navy</span>Tryout
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

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ThemeToggle />

            {userEmail && (
              <div className="nav-user-pill">
                <UserRound size={15} color="var(--text-muted)" />
                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName || userEmail}
                </span>
                {isAdmin && <span className="badge badge-navy" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>Admin</span>}
              </div>
            )}

            <form action="/auth/signout" method="post" style={{ margin: 0 }}>
              <button
                type="submit"
                className="btn btn-ghost btn-sm"
                title="Keluar"
                style={{ padding: 6 }}
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="shell desktop-density">{children}</main>

      <nav className="bottom-nav" aria-label="Navigasi Mobile">
        <Link
          href="/dashboard"
          className={pathname === "/dashboard" ? "active" : ""}
        >
          <House size={20} />
          Beranda
        </Link>
        <Link
          href="/dashboard"
          className={pathname.startsWith("/exams") ? "active" : ""}
        >
          <ClipboardList size={20} />
          Ujian
        </Link>
        <Link
          href="/profile"
          className={pathname === "/profile" ? "active" : ""}
        >
          <UserRound size={20} />
          Profil
        </Link>
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className={pathname.startsWith("/admin") ? "active" : ""}
            style={{ color: "var(--brand-accent)" }}
          >
            <Shield size={20} />
            Admin
          </Link>
        )}
      </nav>
    </>
  );
}
