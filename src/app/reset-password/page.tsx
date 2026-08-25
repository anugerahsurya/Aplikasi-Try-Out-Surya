"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setStatus({ type: "error", message: "Password minimal 6 karakter." });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Konfirmasi password tidak cocok." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setStatus({ type: "error", message: error.message || "Gagal memperbarui password." });
      } else {
        setStatus({
          type: "success",
          message: "Password berhasil diperbarui! Mengalihkan ke dashboard...",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err: any) {
      setStatus({ type: "error", message: "Terjadi kesalahan. Silakan coba lagi." });
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
        padding: "32px 20px",
        backgroundColor: "var(--bg-canvas)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 20,
        }}
      >
        <ThemeToggle />
      </div>

      <section style={{ width: "min(100%, 420px)" }}>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <span className="eyebrow">Keamanan Akun</span>
            <h1 style={{ fontSize: "1.6rem", margin: "4px 0 8px" }}>Password Baru</h1>
            <p className="muted" style={{ fontSize: "0.9rem", margin: 0 }}>
              Buat password baru yang aman untuk akun Anda.
            </p>
          </div>

          {status && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                marginBottom: 18,
                fontSize: "0.88rem",
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

          <form onSubmit={handleReset} style={{ display: "grid", gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="password">
                Password Baru
              </label>
              <div style={{ position: "relative" }}>
                <Lock
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
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  placeholder="••••••••"
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="confirm_password">
                Ulangi Password Baru
              </label>
              <div style={{ position: "relative" }}>
                <Lock
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
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field"
                  placeholder="••••••••"
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-accent btn-lg"
              style={{ width: "100%", marginTop: 6 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  Simpan & Masuk <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
