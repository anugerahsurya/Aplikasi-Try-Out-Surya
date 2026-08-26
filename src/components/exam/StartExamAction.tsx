"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface StartExamActionProps {
  examId: string;
  isExistingAttempt: boolean;
  disabled?: boolean;
}

export function StartExamAction({
  examId,
  isExistingAttempt,
  disabled = false,
}: StartExamActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    if (isLoading || disabled) return;
    setIsLoading(true);

    try {
      // 1. Proactively request fullscreen on user click gesture if supported
      try {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement) {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          }
        }
      } catch (fsErr) {
        console.warn("Fullscreen request error (skipped):", fsErr);
      }

      // 2. Start or resume attempt via API
      const res = await fetch(`/api/attempts/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_id: examId }),
      });

      const data = await res.json();
      if (res.ok && data.attempt_id) {
        router.push(`/tryout/${data.attempt_id}`);
      } else {
        alert(data.error || "Gagal memulai sesi ujian.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Start exam error:", err);
      alert("Terjadi kesalahan koneksi saat memulai ujian.");
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={disabled || isLoading}
      className="btn btn-primary btn-lg"
      style={{ fontWeight: 800 }}
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" /> Menyiapkan Ujian...
        </>
      ) : (
        <>
          <Play size={18} /> {isExistingAttempt ? "Lanjutkan Ujian" : "Mulai Ujian Sekarang"}
        </>
      )}
    </button>
  );
}
