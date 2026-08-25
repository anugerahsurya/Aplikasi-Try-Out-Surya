"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({
          type: "success",
          message: data.message || "Tautan pemulihan password telah dikirim ke email Anda.",
        });
      } else {
        setStatus({
          type: "error",
          message: data.error || "Gagal memproses permintaan reset password.",
        });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: "Terjadi kesalahan koneksi. Silakan coba lagi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px 18px",
        backgroundColor: "var(--bg-canvas)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 20,
        }}
      >
        <ThemeToggle />
      </div>

      <section style={{ width: "min(100%, 420px)" }}>
        <Link
          href="/login"
          style={{
            color: "var(--brand-accent)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.86rem",
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Halaman Login
        </Link>

        <div className="card" style={{ padding: "26px 24px" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 10 }}>
              <Logo size="md" />
            </div>
            <h1 style={{ fontSize: "1.45rem", margin: "4px 0 6px" }}>Reset Password</h1>
            <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>
              Masukkan alamat email akun Anda untuk menerima instruksi pembuatan password baru.
            </p>
          </div>

          {status && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                marginBottom: 16,
                fontSize: "0.86rem",
                fontWeight: 600,
                background: status.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
                color: status.type === "success" ? "var(--success)" : "var(--danger)",
                border: `1px solid ${status.type === "success" ? "var(--success-border)" : "var(--danger-border)"}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="email">
                Alamat Email Terdaftar
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={18}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  placeholder="nama@email.com"
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 4 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <Send size={16} /> Kirim Tautan Reset
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
