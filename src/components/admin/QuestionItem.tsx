"use client";

import { useState } from "react";
import { Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface QuestionItemProps {
  question: any;
  index: number;
  onDelete: (questionId: string) => Promise<void>;
}

export function QuestionItem({ question, index, onDelete }: QuestionItemProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const options = (question.question_options || []).sort(
    (a: any, b: any) => a.position - b.position
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(question.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="card card-hover" style={{ padding: "20px 22px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="eyebrow">Nomor {index + 1}</span>
            <span
              className={`badge ${
                question.scoring_mode === "option_value"
                  ? "badge-navy"
                  : "badge-neutral"
              }`}
              style={{ fontSize: "0.76rem" }}
            >
              {question.scoring_mode === "option_value"
                ? "Poin Opsi 1–5 (TKP/Psikotes)"
                : `Benar (+${question.correct_score}), Salah (${question.incorrect_score})`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-ghost btn-sm"
            title="Hapus Soal"
            style={{ color: "var(--danger)" }}
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div style={{ fontSize: "0.96rem", lineHeight: 1.6, marginBottom: 14 }}>
          {question.stem}
        </div>

        {/* Options list */}
        <div style={{ display: "grid", gap: 6 }}>
          {options.map((opt: any) => (
            <div
              key={opt.id}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                background: opt.is_correct ? "var(--success-bg)" : "var(--bg-surface-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.88rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <strong style={{ width: 20 }}>{opt.label}.</strong>
                <span>{opt.content}</span>
              </div>

              <div>
                {question.scoring_mode === "option_value" && (
                  <span className="badge badge-navy" style={{ fontSize: "0.76rem" }}>
                    Nilai: {opt.score_value ?? 0}
                  </span>
                )}
                {opt.is_correct && (
                  <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                    <CheckCircle2 size={12} /> Kunci Benar
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {question.explanation && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-surface-secondary)",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>Pembahasan:</strong> {question.explanation}
          </div>
        )}
      </div>

      {/* Next.js-style interactive ConfirmDialog */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Hapus Butir Soal?"
        description={`Apakah Anda yakin ingin menghapus Soal Nomor ${index + 1}? Tindakan ini akan menghapus soal beserta seluruh opsi jawabannya secara permanen.`}
        confirmText="Ya, Hapus Soal"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
      />
    </>
  );
}
