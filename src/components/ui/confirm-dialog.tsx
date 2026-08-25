"use client";

import React, { useEffect } from "react";
import { AlertTriangle, HelpCircle, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  variant = "primary",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-card" style={{ maxWidth: 440 }}>
        {/* Header Icon + Title */}
        <div
          className="modal-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            background: isDanger
              ? "var(--danger-bg)"
              : isWarning
              ? "var(--warning-bg)"
              : "var(--bg-surface-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: isDanger
                  ? "rgba(239, 68, 68, 0.18)"
                  : isWarning
                  ? "rgba(245, 158, 11, 0.18)"
                  : "var(--brand-light)",
                color: isDanger ? "var(--danger)" : isWarning ? "var(--warning)" : "var(--brand-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isDanger || isWarning ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
            </div>
            <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700 }}>{title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-ghost btn-sm"
            style={{ padding: 4, color: "var(--text-muted)", borderRadius: "50%" }}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Text */}
        <div className="modal-body">
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
            }}
          >
            {description}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-outline"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn ${
              isDanger ? "btn-danger" : isWarning ? "btn-accent" : "btn-primary"
            }`}
            style={{ fontWeight: 700 }}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Memproses...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
