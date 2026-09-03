"use client";

import { useState } from "react";
import { PlusCircle, Trash2, CheckCircle2, HelpCircle } from "lucide-react";
import { ScoringMode } from "@/types";

interface QuestionFormProps {
  examId: string;
  nextPosition: number;
}

export function QuestionForm({ examId, nextPosition }: QuestionFormProps) {
  const [scoringMode, setScoringMode] = useState<ScoringMode>("correctness");
  const [correctLabel, setCorrectLabel] = useState("A");
  const [optionScores, setOptionScores] = useState<Record<string, number>>({
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
  });

  const labels = ["A", "B", "C", "D", "E"];

  const handleScoreChange = (label: string, value: string) => {
    const parsed = parseInt(value, 10);
    // clamp 1 to 5
    const clamped = isNaN(parsed) ? 1 : Math.max(1, Math.min(5, parsed));
    setOptionScores((prev) => ({ ...prev, [label]: clamped }));
  };

  return (
    <form
      action="/api/admin/questions/create"
      method="POST"
      className="card"
      style={{ padding: 28, border: "1px solid var(--border-color)" }}
    >
      <input type="hidden" name="exam_id" value={examId} />
      <input type="hidden" name="position" value={nextPosition} />
      <input type="hidden" name="scoring_mode" value={scoringMode} />

      <h3 style={{ fontSize: "1.2rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <PlusCircle size={20} color="var(--brand-accent)" /> Tambah Butir Soal Baru (Nomor {nextPosition})
      </h3>

      <div style={{ display: "grid", gap: 20 }}>
        {/* Scoring Mode Switcher */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Tipe & Skema Penilaian Soal</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div
              onClick={() => setScoringMode("correctness")}
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-sm)",
                border: `2px solid ${scoringMode === "correctness" ? "var(--brand-accent)" : "var(--border-color)"}`,
                background: scoringMode === "correctness" ? "var(--brand-accent-subtle)" : "var(--bg-surface)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.95rem" }}>
                1. Jawaban Benar / Salah (TWK / TIU / Akademik)
              </strong>
              <span className="muted" style={{ fontSize: "0.82rem" }}>
                Satu kunci jawaban benar (+skor), jawaban salah (-skor/0).
              </span>
            </div>

            <div
              onClick={() => setScoringMode("option_value")}
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-sm)",
                border: `2px solid ${scoringMode === "option_value" ? "var(--brand-accent)" : "var(--border-color)"}`,
                background: scoringMode === "option_value" ? "var(--brand-accent-subtle)" : "var(--bg-surface)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.95rem" }}>
                2. Skor Berjenjang Tiap Opsi 1–5 (TKP / Manajerial)
              </strong>
              <span className="muted" style={{ fontSize: "0.82rem" }}>
                Setiap opsi A–E memiliki nilai tepat integer 1 sampai 5.
              </span>
            </div>
          </div>
        </div>

        {/* Score settings for correctness mode */}
        {scoringMode === "correctness" && (
          <div className="grid grid-3" style={{ background: "var(--bg-surface-secondary)", padding: 14, borderRadius: 10, border: "1px solid var(--border-color)" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.82rem" }}>Skor Benar</label>
              <input type="number" name="correct_score" defaultValue={4} className="field" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.82rem" }}>Skor Salah</label>
              <input type="number" name="incorrect_score" defaultValue={-1} className="field" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.82rem" }}>Skor Kosong</label>
              <input type="number" name="blank_score" defaultValue={0} className="field" required />
            </div>
          </div>
        )}

        {/* Question Stem Text */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="stem">
            Teks Butir Soal (Stem) *
          </label>
          <textarea
            id="stem"
            name="stem"
            className="field"
            style={{ minHeight: 110 }}
            placeholder="Tuliskan teks pertanyaan atau studi kasus di sini..."
            required
          />
        </div>

        {/* 5 Options Inputs (A-E) */}
        <div>
          <label className="form-label" style={{ marginBottom: 12 }}>
            Pilihan Opsi Jawaban (A, B, C, D, E)
          </label>

          <div style={{ display: "grid", gap: 12 }}>
            {labels.map((lbl) => (
              <div
                key={lbl}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--bg-surface)",
                  padding: 10,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--brand-accent)",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {lbl}
                </span>

                <input
                  type="text"
                  name={`option_content_${lbl}`}
                  className="field"
                  placeholder={`Isi pernyataan opsi ${lbl}...`}
                  required
                  style={{ flex: 1 }}
                />

                {scoringMode === "correctness" ? (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: correctLabel === lbl ? "var(--success-bg)" : "var(--bg-surface-secondary)",
                      color: correctLabel === lbl ? "var(--success)" : "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="radio"
                      name="correct_option"
                      value={lbl}
                      checked={correctLabel === lbl}
                      onChange={() => setCorrectLabel(lbl)}
                    />
                    <span>Kunci Jawaban</span>
                  </label>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--brand-accent)" }}>
                      Nilai (1–5):
                    </span>
                    <input
                      type="number"
                      name={`option_score_${lbl}`}
                      min={1}
                      max={5}
                      value={optionScores[lbl] || 1}
                      onChange={(e) => handleScoreChange(lbl, e.target.value)}
                      className="field"
                      style={{ width: 64, textAlign: "center", fontWeight: 800 }}
                      required
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="explanation">
            Pembahasan / Keterangan Soal (Opsional)
          </label>
          <textarea
            id="explanation"
            name="explanation"
            className="field"
            placeholder="Pembahasan akan ditampilkan kepada peserta setelah hasil ujian dirilis."
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" className="btn btn-primary btn-lg">
            <PlusCircle size={18} /> Simpan Butir Soal
          </button>
        </div>
      </div>
    </form>
  );
}
