"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Reset and complete animation on route change
    setProgress(30);
    setIsVisible(true);

    const timer1 = setTimeout(() => {
      setProgress(75);
    }, 120);

    const timer2 = setTimeout(() => {
      setProgress(100);
    }, 280);

    const timer3 = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname, searchParams]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 999999,
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #60a5fa 100%)",
          boxShadow: "0 0 10px rgba(59, 130, 246, 0.7), 0 0 5px rgba(37, 99, 235, 0.9)",
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
