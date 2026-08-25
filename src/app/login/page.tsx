import Link from "next/link";
import { Sparkles, Asterisk } from "lucide-react";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LoginPage() {
  return (
    <main className="login-page-container">
      {/* Top Floating Theme Switcher */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 20,
        }}
      >
        <ThemeToggle />
      </div>

      <section className="login-split-card">
        {/* Left Side: Visual Aurora Banner Card */}
        <div className="login-left-banner">
          <div className="login-banner-star">
            <Asterisk size={24} strokeWidth={2.5} />
          </div>

          <div className="login-banner-content">
            <p className="banner-eyebrow">Platform Ujian & Try Out Terstandar</p>
            <h2 className="banner-heading">
              Akses simulasi ujian terbaik dengan pemantauan aman dan penilaian presisi.
            </h2>
          </div>
        </div>

        {/* Right Side: Clean Form Container */}
        <div className="login-right-form">
          <div style={{ marginBottom: 18 }}>
            <div className="login-brand-icon">
              <Asterisk size={18} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px", fontWeight: 800 }}>
              Masuk ke Akun
            </h1>
            <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>
              Akses sesi ujian, evaluasi nilai, dan analisis hasil belajar Anda.
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
              Bantuan admin
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
