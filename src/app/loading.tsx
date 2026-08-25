import React from "react";
import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "var(--brand-gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--brand-glow)",
        }}
      >
        <Loader2 size={24} color="#ffffff" className="animate-spin" />
      </div>
      <p className="muted" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
        Memuat data...
      </p>
    </div>
  );
}
