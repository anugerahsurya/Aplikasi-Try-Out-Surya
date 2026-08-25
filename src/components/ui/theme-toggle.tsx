"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = prefersDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Ubah tema"
        className={`theme-toggle-btn ${className || ""}`}
        style={{ opacity: 0, width: 36, height: 36 }}
      >
        <Sun size={17} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Beralih ke Mode Gelap" : "Beralih ke Mode Terang"}
      title={theme === "light" ? "Aktifkan Mode Gelap" : "Aktifkan Mode Terang"}
      className={`theme-toggle-btn ${className || ""}`}
    >
      {theme === "light" ? (
        <Moon size={17} className="theme-icon" />
      ) : (
        <Sun size={17} className="theme-icon" />
      )}
    </button>
  );
}
