import React from "react";

export default function AdminParticipantsLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <div className="skeleton" style={{ width: 140, height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 240, height: 32, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 380, height: 16 }} />
        </div>
        <div className="skeleton" style={{ width: 150, height: 38, borderRadius: "var(--radius-md)" }} />
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "grid", gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: "100%", height: 52, borderRadius: "var(--radius-sm)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
