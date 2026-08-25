import Link from "next/link";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  return (
    <main className="login-page-container">
      {/* Top Floating Theme Switcher */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 20,
        }}
      >
        <ThemeToggle />
      </div>

      <section className="login-split-card">
        {/* Left Side: Visual Aurora Banner Card (Deep Obsidian & Iris) */}
        <div className="login-left-banner">
          <div>
            <Logo size="md" showText={false} />
          </div>

          <div className="login-banner-content">
            <p className="banner-eyebrow">Simulasi Try Out Terpadu 2026</p>
            <h2 className="banner-heading">
              Tingkatkan kesiapan ujian dengan analisis nilai presisi dan evaluasi terstandar.
            </h2>
          </div>
        </div>

        {/* Right Side: Clean Form Container */}
        <div className="login-right-form">
          <div style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 10 }}>
              <Logo size="md" />
            </div>
            <h1 style={{ fontSize: "1.45rem", margin: "0 0 4px", fontWeight: 800 }}>
              Masuk ke Akun
            </h1>
            <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
              Silakan masukkan email dan password akun Anda untuk memulai sesi.
            </p>
          </div>

          <LoginForm />

          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.82rem",
            }}
          >
            <Link
              href="/forgot-password"
              style={{
                color: "var(--brand-accent)",
                fontWeight: 600,
              }}
            >
              Lupa password?
            </Link>
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              Bantuan Pengawas
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
