import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const iconDimensions = size === "sm" ? 24 : size === "lg" ? 36 : 28;
  const textSize = size === "sm" ? "1.05rem" : size === "lg" ? "1.45rem" : "1.22rem";

  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 7 : 9,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {/* Bespoke Geometric Navy Brandmark */}
      <svg
        width={iconDimensions}
        height={iconDimensions}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="logoNavyGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="logoNavyAccent" x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <filter id="logoNavyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1e3a8a" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Rounded Diamond Container in Deep Navy */}
        <rect
          x="3"
          y="3"
          width="34"
          height="34"
          rx="10"
          fill="url(#logoNavyGrad)"
          filter="url(#logoNavyGlow)"
        />

        {/* Inner Subtle Geometric Shield Accent */}
        <path
          d="M20 9L29 14.5V22C29 27.5 25.2 32.5 20 34C14.8 32.5 11 27.5 11 22V14.5L20 9Z"
          fill="white"
          fillOpacity="0.12"
        />

        {/* Central Intersecting Sparkle/Check Mark */}
        <path
          d="M16.5 20.5L19 23L24.5 16.5"
          stroke="#ffffff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Top-Right Ambient Energy Node */}
        <circle cx="28" cy="12" r="2.2" fill="url(#logoNavyAccent)" />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <span
          style={{
            fontSize: textSize,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            lineHeight: 1,
            color: "var(--text-primary)",
          }}
        >
          <span>Try Out</span>
          <span
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
              color: "#ffffff",
              fontSize: "0.78em",
              padding: "2px 7px",
              borderRadius: "6px",
              fontWeight: 800,
              letterSpacing: "0.02em",
              boxShadow: "0 2px 8px rgba(30, 58, 138, 0.3)",
            }}
          >
            Yuk
          </span>
        </span>
      )}
    </div>
  );
}
