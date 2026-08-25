import React from "react";

export default function AdminExamsLoading() {
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

      <div className="grid grid-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="card"
            style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 20 }} />
              <div className="skeleton" style={{ width: 50, height: 16 }} />
            </div>
            <div className="skeleton" style={{ width: "85%", height: 22 }} />
            <div className="skeleton" style={{ width: "100%", height: 14 }} />
            <div className="skeleton" style={{ width: "60%", height: 14 }} />
            <div className="skeleton" style={{ width: "100%", height: 36, marginTop: 8, borderRadius: "var(--radius-md)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
