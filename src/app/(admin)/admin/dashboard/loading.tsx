import React from "react";

export default function AdminDashboardLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0" }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 140, height: 14, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 260, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 420, height: 16 }} />
      </div>

      {/* 4 Crafted Stat Cards Skeleton */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="stat-card-crafted"
            style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 11 }} />
              <div className="skeleton" style={{ width: 70, height: 20, borderRadius: 20 }} />
            </div>
            <div className="skeleton" style={{ width: 100, height: 14 }} />
            <div className="skeleton" style={{ width: 70, height: 36 }} />
            <div className="skeleton" style={{ width: 140, height: 12 }} />
            <div className="skeleton" style={{ width: "100%", height: 12, marginTop: 8 }} />
          </div>
        ))}
      </div>

      {/* Recent Attempts Table Skeleton */}
      <div className="card" style={{ padding: "22px 24px" }}>
        <div style={{ marginBottom: 18 }}>
          <div className="skeleton" style={{ width: 220, height: 22, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 340, height: 14 }} />
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
