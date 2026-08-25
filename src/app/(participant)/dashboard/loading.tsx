import React from "react";

export default function ParticipantDashboardLoading() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "10px 0" }}>
      {/* Greeting Skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div className="skeleton" style={{ width: 140, height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 28, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 340, height: 14 }} />
        </div>
        <div
          className="skeleton"
          style={{ width: 44, height: 44, borderRadius: "var(--radius-pill)" }}
        />
      </div>

      {/* Hero Passing Probability Skeleton */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div
            className="skeleton"
            style={{ width: 68, height: 68, borderRadius: "var(--radius-pill)" }}
          />
          <div>
            <div className="skeleton" style={{ width: 160, height: 16, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 240, height: 14 }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: 130, height: 38, borderRadius: "var(--radius-md)" }} />
      </div>

      {/* Topic Cards Grid Skeleton */}
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 180, height: 22, marginBottom: 16 }} />
        <div className="grid grid-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="card"
              style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10 }} />
                <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 20 }} />
              </div>
              <div className="skeleton" style={{ width: "80%", height: 20 }} />
              <div className="skeleton" style={{ width: "100%", height: 14 }} />
              <div className="skeleton" style={{ width: "100%", height: 36, marginTop: 4, borderRadius: "var(--radius-md)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
