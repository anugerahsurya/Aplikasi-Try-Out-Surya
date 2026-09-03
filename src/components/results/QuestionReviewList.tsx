"use client";

import React, { useState, useMemo } from "react";
import { Check, Sparkles, AlertCircle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

interface ReviewOption {
  id: string;
  label: string;
  content: string;
  is_correct?: boolean;
  score_value?: number | null;
}

export interface QuestionReviewItem {
  id: string;
  position: number;
  stem: string;
  scoring_mode?: string;
  options: ReviewOption[];
  selectedOptionId?: string | null;
  earnedScore: number;
  isCorrect: boolean;
  isBlank: boolean;
  explanation?: string | null;
}

interface Props {
  questions: QuestionReviewItem[];
}

type FilterType = "all" | "wrong" | "correct" | "blank";

export default function QuestionReviewList({ questions }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");

  const counts = useMemo(() => {
    let wrong = 0;
    let correct = 0;
    let blank = 0;
    questions.forEach((q) => {
      if (q.isBlank) blank++;
      else if (q.isCorrect) correct++;
      else wrong++;
    });
    return { all: questions.length, wrong, correct, blank };
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    switch (filter) {
      case "wrong":
        return questions.filter((q) => !q.isBlank && !q.isCorrect);
      case "correct":
        return questions.filter((q) => q.isCorrect);
      case "blank":
        return questions.filter((q) => q.isBlank);
      case "all":
      default:
        return questions;
    }
  }, [questions, filter]);

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: "0 0 4px", fontWeight: 800 }}>
            Pembahasan Soal & Kunci Jawaban
          </h2>
          <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>
            Tinjau hasil evaluasi setiap nomor soal dengan filter status di bawah ini
          </p>
        </div>

        {/* Filter Pill Group */}
        <div className="filter-pill-group" style={{ marginBottom: 0 }}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`filter-pill ${filter === "all" ? "active" : ""}`}
          >
            Semua
            <span className="pill-count">{counts.all}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("wrong")}
            className={`filter-pill ${filter === "wrong" ? "active" : ""}`}
            style={{
              borderColor: filter === "wrong" ? "var(--danger)" : undefined,
              background: filter === "wrong" ? "var(--danger)" : undefined,
              color: filter === "wrong" ? "#ffffff" : undefined,
            }}
          >
            <XCircle size={14} />
            Salah
            <span className="pill-count">{counts.wrong}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("correct")}
            className={`filter-pill ${filter === "correct" ? "active" : ""}`}
            style={{
              borderColor: filter === "correct" ? "var(--success)" : undefined,
              background: filter === "correct" ? "var(--success)" : undefined,
              color: filter === "correct" ? "#ffffff" : undefined,
            }}
          >
            <CheckCircle2 size={14} />
            Benar
            <span className="pill-count">{counts.correct}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("blank")}
            className={`filter-pill ${filter === "blank" ? "active" : ""}`}
            style={{
              borderColor: filter === "blank" ? "#64748b" : undefined,
              background: filter === "blank" ? "#64748b" : undefined,
              color: filter === "blank" ? "#ffffff" : undefined,
            }}
          >
            <HelpCircle size={14} />
            Kosong
            <span className="pill-count">{counts.blank}</span>
          </button>
        </div>
      </div>

      {/* Filtered Empty State */}
      {filteredQuestions.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
            background: "var(--bg-surface)",
          }}
        >
          <AlertCircle size={32} color="var(--brand-accent)" style={{ margin: "0 auto 10px" }} />
          <h4 style={{ margin: "0 0 6px", fontSize: "1rem" }}>
            Tidak ada butir soal dalam kategori ini
          </h4>
          <p className="muted" style={{ fontSize: "0.85rem", maxWidth: 360, margin: "0 auto" }}>
            {filter === "wrong" && "Luar biasa! Tidak ada jawaban yang salah untuk kategori ini."}
            {filter === "blank" && "Semua butir soal telah berhasil Anda jawab dengan lengkap."}
            {filter === "correct" && "Belum ada jawaban benar yang tercatat."}
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="btn btn-outline btn-sm"
            style={{ marginTop: 14 }}
          >
            Tampilkan Semua Soal
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {filteredQuestions.map((q) => {
            // Find original question index (1-based)
            const originalIndex = questions.findIndex((orig) => orig.id === q.id) + 1;

            return (
              <div key={q.id} className="card" style={{ padding: "20px 22px" }}>
                {/* Header Question Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="badge badge-navy" style={{ fontWeight: 700 }}>
                      Soal #{originalIndex}
                    </span>
                    {q.isBlank ? (
                      <span className="badge badge-neutral">Tidak Dijawab</span>
                    ) : q.isCorrect ? (
                      <span className="badge badge-success">Jawaban Benar</span>
                    ) : (
                      <span className="badge badge-danger">Jawaban Salah</span>
                    )}
                  </div>
                  <span
                    className={`badge ${q.earnedScore > 0 ? "badge-success" : "badge-neutral"}`}
                    style={{ fontWeight: 800, fontSize: "0.8rem" }}
                  >
                    Poin: {q.earnedScore}
                  </span>
                </div>

                {/* Question Stem */}
                <div
                  style={{
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    marginBottom: 16,
                    color: "var(--text-primary)",
                  }}
                >
                  {q.stem}
                </div>

                {/* Options Review */}
                <div style={{ display: "grid", gap: 8, marginBottom: q.explanation ? 16 : 0 }}>
                  {q.options.map((opt) => {
                    const isUserChoice = q.selectedOptionId === opt.id;
                    const isKeyAnswer = opt.is_correct;

                    let borderColor = "var(--border-color)";
                    let bg = "var(--bg-surface)";
                    if (isUserChoice && !isKeyAnswer) {
                      borderColor = "var(--danger)";
                      bg = "var(--danger-bg)";
                    }
                    if (isKeyAnswer) {
                      borderColor = "var(--success)";
                      bg = "var(--success-bg)";
                    }

                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          border: `1.5px solid ${borderColor}`,
                          background: bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: "0.9rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong
                            style={{
                              width: 24,
                              height: 24,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 6,
                              background: isUserChoice
                                ? "var(--brand-accent)"
                                : "var(--bg-surface-secondary)",
                              color: isUserChoice ? "#ffffff" : "var(--text-primary)",
                              fontSize: "0.82rem",
                            }}
                          >
                            {opt.label}
                          </strong>
                          <span style={{ color: "var(--text-primary)" }}>{opt.content}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {q.scoring_mode === "option_value" && (
                            <span className="badge badge-navy" style={{ fontSize: "0.72rem" }}>
                              Skor: {opt.score_value ?? 0}
                            </span>
                          )}
                          {isUserChoice && (
                            <span
                              className={`badge ${isKeyAnswer ? "badge-success" : "badge-danger"}`}
                              style={{ fontSize: "0.7rem" }}
                            >
                              Pilihan Anda
                            </span>
                          )}
                          {isKeyAnswer && (
                            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                              <Check size={11} /> Kunci Jawaban
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {q.explanation && (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-surface-secondary)",
                      borderLeft: "4px solid var(--brand-accent)",
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "var(--brand-accent)",
                      }}
                    >
                      <Sparkles size={14} /> Pembahasan & Analisis Soal
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.88rem",
                        lineHeight: 1.6,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
