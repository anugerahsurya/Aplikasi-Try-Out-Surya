"use client";

import { useState } from "react";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";

interface ResetAttemptButtonProps {
  attemptId: string;
  studentName: string;
  examTitle?: string;
  redirectUrlOnSuccess?: string;
  variant?: "primary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md";
  onSuccess?: () => void;
}

export function ResetAttemptButton({
  attemptId,
  studentName,
  examTitle,
  redirectUrlOnSuccess,
  variant = "outline",
  size = "sm",
  onSuccess,
}: ResetAttemptButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/attempts/${attemptId}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setShowConfirm(false);
        setIsSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
        if (redirectUrlOnSuccess) {
          router.push(redirectUrlOnSuccess);
        } else {
          router.refresh();
          window.location.reload();
        }
      } else {
        alert(data.error || "Gagal mereset sesi ujian.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat mereset ujian.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isLoading || isSuccess}
        className={`btn btn-${variant} btn-${size}`}
        style={{ color: variant === "outline" ? "var(--danger)" : undefined }}
        title="Reset sesi ujian agar peserta dapat mengulang dari awal"
      >
        {isSuccess ? (
          <>
            <CheckCircle2 size={size === "sm" ? 13 : 15} color="var(--success)" /> Ter-reset!
          </>
        ) : (
          <>
            <RotateCcw size={size === "sm" ? 13 : 15} /> Reset Ujian
          </>
        )}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Reset Sesi Ujian Peserta?"
        description={`Apakah Anda yakin ingin mereset sesi ujian ${examTitle ? `"${examTitle}" ` : ""}untuk ${studentName}? Seluruh riwayat jawaban, skor, dan log keamanan sesi ini akan dihapus permanen, dan peserta dapat langsung memulai ujian dari awal.`}
        confirmText="Ya, Reset Ujian"
        cancelText="Batal"
        variant="danger"
        isLoading={isLoading}
        onConfirm={handleReset}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}
