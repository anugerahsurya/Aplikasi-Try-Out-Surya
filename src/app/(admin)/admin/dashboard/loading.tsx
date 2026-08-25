import React from "react";

export default function AdminDashboardLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0" }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 260, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 420, height: 16 }} />
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-4" style={{ marginBottom: 32 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="card"
            style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div className="skeleton" style={{ width: 90, height: 14 }} />
            <div className="skeleton" style={{ width: 60, height: 36 }} />
            <div className="skeleton" style={{ width: 110, height: 12 }} />
          </div>
        ))}
      </div>

      {/* Recent Attempts Table Skeleton */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div className="skeleton" style={{ width: 200, height: 22, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 300, height: 14 }} />
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="skeleton"
              style={{ width: "100%", height: 48, borderRadius: "var(--radius-sm)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
