"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { login, AuthState } from "./actions";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} style={{ display: "grid", gap: 13 }}>
      {state?.error && (
        <div
          role="alert"
          style={{
            background: "var(--danger-bg)",
            color: "var(--danger)",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.86rem",
            fontWeight: 600,
            border: "1px solid var(--danger-border)",
          }}
        >
          {state.error}
        </div>
      )}

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" htmlFor="email">
          Alamat Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="field"
          placeholder="nama@email.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="field"
            placeholder="••••••••"
            style={{ paddingRight: 42 }}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: 0,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={pending}
        style={{ width: "100%", marginTop: 4 }}
      >
        {pending ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Memverifikasi...
          </>
        ) : (
          <>
            Masuk Sekarang <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
