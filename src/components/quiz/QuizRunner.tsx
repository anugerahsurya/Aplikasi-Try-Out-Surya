"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  ShieldAlert,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";
import { RunnerData, RunnerQuestion } from "@/types";
import {
  saveToOutbox,
  getOutboxForAttempt,
  removeFromOutbox,
  clearOutboxForAttempt,
} from "@/lib/storage/indexed-db";

interface QuizRunnerProps {
  initialData: RunnerData;
}

type SyncStatus = "saved" | "saving" | "offline" | "error";

export function QuizRunner({ initialData }: QuizRunnerProps) {
  const router = useRouter();
  const attemptId = initialData.id;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, { selectedOptionId: string | null; isFlagged: boolean }>
  >(() => {
    const init: Record<string, { selectedOptionId: string | null; isFlagged: boolean }> = {};
    initialData.questions.forEach((q) => {
      init[q.id] = {
        selectedOptionId: q.selected_option_id || null,
        isFlagged: false,
      };
    });
    return init;
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("saved");
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    const deadline = new Date(initialData.deadline_at).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((deadline - now) / 1000));
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  const currentQuestion = initialData.questions[currentIndex];
  const policy = initialData.security_policy || {
    require_fullscreen: true,
    disable_clipboard: true,
    log_focus_loss: true,
    log_connectivity: true,
    warn_after_violations: 1,
    auto_submit_after_violations: 0,
  };

  // -------------------------------------------------------------
  // 1. Sync & Outbox Flush
  // -------------------------------------------------------------
  const flushOutbox = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    try {
      setSyncStatus("saving");
      const pendingItems = await getOutboxForAttempt(attemptId);
      if (pendingItems.length === 0) {
        setSyncStatus("saved");
        return;
      }

      const payload = pendingItems.map((item) => ({
        question_id: item.questionId,
        selected_option_id: item.selectedOptionId,
        client_updated_at: item.clientUpdatedAt,
      }));

      const res = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      if (res.ok) {
        await removeFromOutbox(pendingItems.map((i) => i.id));
        setSyncStatus("saved");
      } else {
        setSyncStatus("error");
      }
    } catch (err) {
      console.warn("Autosave flush failed:", err);
      setSyncStatus("offline");
    }
  }, [attemptId]);

  // Handle Answer Selection
  const handleSelectOption = useCallback(
    async (optionId: string) => {
      if (!currentQuestion || isSubmittingRef.current) return;

      const questionId = currentQuestion.id;
      const newSelected = answers[questionId]?.selectedOptionId === optionId ? null : optionId;

      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          selectedOptionId: newSelected,
          isFlagged: prev[questionId]?.isFlagged || false,
        },
      }));

      const nowIso = new Date().toISOString();

      // Save to IndexedDB outbox immediately
      await saveToOutbox({
        id: `${attemptId}_${questionId}`,
        attemptId,
        questionId,
        selectedOptionId: newSelected,
        clientUpdatedAt: nowIso,
      });

      // Debounce network request
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setSyncStatus("saving");
      debounceTimerRef.current = setTimeout(() => {
        flushOutbox();
      }, 700);
    },
    [currentQuestion, answers, attemptId, flushOutbox]
  );

  const handleToggleFlag = useCallback(() => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: prev[questionId]?.selectedOptionId || null,
        isFlagged: !prev[questionId]?.isFlagged,
      },
    }));
  }, [currentQuestion]);

  const handleClearAnswer = useCallback(async () => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: null,
        isFlagged: prev[questionId]?.isFlagged || false,
      },
    }));

    await saveToOutbox({
      id: `${attemptId}_${questionId}`,
      attemptId,
      questionId,
      selectedOptionId: null,
      clientUpdatedAt: new Date().toISOString(),
    });

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushOutbox, 400);
  }, [currentQuestion, attemptId, flushOutbox]);

  // -------------------------------------------------------------
  // 2. Final Submission
  // -------------------------------------------------------------
  const executeSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // 1. Flush any remaining items in outbox
      await flushOutbox();

      // 2. Call submit API
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        await clearOutboxForAttempt(attemptId);
        router.replace(data.redirect_url || `/results/${attemptId}`);
      } else {
        alert(`Gagal mengirim ujian: ${data.error || "Silakan coba lagi."}`);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan saat submit. Periksa koneksi Anda.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [attemptId, flushOutbox, router]);

  // -------------------------------------------------------------
  // 3. Server-Authoritative Timer Countdown
  // -------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      const deadline = new Date(initialData.deadline_at).getTime();
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeftSeconds(diff);

      if (diff <= 0) {
        clearInterval(timer);
        executeSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [initialData.deadline_at, executeSubmit]);

  // -------------------------------------------------------------
  // 4. Anti-Cheating & Audit Logger
  // -------------------------------------------------------------
  const logSecurityEvent = useCallback(
    async (eventType: string, metadata: Record<string, any> = {}) => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: eventType,
            metadata: {
              ...metadata,
              user_agent: navigator.userAgent,
              timestamp: new Date().toISOString(),
            },
          }),
        });
        const data = await res.json();
        if (data.violation_count !== undefined) {
          setViolationCount(data.violation_count);

          // Check auto-submit threshold
          if (
            policy.auto_submit_after_violations > 0 &&
            data.violation_count >= policy.auto_submit_after_violations
          ) {
            alert(
              `Ujian diakhiri otomatis karena jumlah pelanggaran keamanan mencapai ambang batas (${policy.auto_submit_after_violations} kali).`
            );
            executeSubmit();
          }
        }
      } catch (err) {
        console.warn("Failed to log event:", err);
      }
    },
    [attemptId, policy, executeSubmit]
  );

  // Anti-Cheating Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent("tab_hidden", { reason: "Pindah tab atau meminimalkan browser" });
        setWarningMessage("Anda terdeteksi meninggalkan halaman ujian (pindah tab atau membuka aplikasi lain).");
      }
    };

    const handleWindowBlur = () => {
      if (policy.log_focus_loss) {
        logSecurityEvent("window_blur", { reason: "Jendela browser kehilangan fokus" });
      }
    };

    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && policy.require_fullscreen) {
        logSecurityEvent("fullscreen_exit", { reason: "Keluar dari mode layar penuh" });
        setWarningMessage("Anda keluar dari mode layar penuh. Klik tombol di bawah untuk kembali ke fullscreen.");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (policy.disable_clipboard) {
        e.preventDefault();
        logSecurityEvent("clipboard_attempt", { action: "contextmenu" });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts: Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+P, Ctrl+U, F12, PrintScreen
      if (
        policy.disable_clipboard &&
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "p", "u", "s", "a"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        logSecurityEvent("clipboard_attempt", { key: e.key });
      }
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
        e.preventDefault();
        logSecurityEvent("dev_tools_attempt");
      }
      if (e.key === "PrintScreen") {
        logSecurityEvent("print_screen_attempt");
      }
    };

    const handleOnline = () => {
      setSyncStatus("saved");
      flushOutbox();
      logSecurityEvent("connection_online");
    };

    const handleOffline = () => {
      setSyncStatus("offline");
      logSecurityEvent("connection_offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial fullscreen state check
    setIsFullscreen(Boolean(document.fullscreenElement));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [policy, logSecurityEvent, flushOutbox]);

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setWarningMessage(null);
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    }
  };

  // -------------------------------------------------------------
  // 5. Calculations for Palette
  // -------------------------------------------------------------
  const totalQuestions = initialData.questions.length;
  let answeredCount = 0;
  let flaggedCount = 0;

  Object.values(answers).forEach((ans) => {
    if (ans.selectedOptionId) answeredCount++;
    if (ans.isFlagged) flaggedCount++;
  });

  const unansweredCount = totalQuestions - answeredCount;

  // Format Timer
  const hours = Math.floor(timeLeftSeconds / 3600);
  const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}>
      {/* Sticky Quiz Header */}
      <header className="quiz-header">
        <div className="quiz-header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h2 style={{ fontSize: "1.08rem", margin: 0, fontWeight: 700 }}>
              {initialData.title}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {syncStatus === "saving" && (
                <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>
                  <Loader2 size={12} className="animate-spin" /> Menyimpan...
                </span>
              )}
              {syncStatus === "saved" && (
                <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                  <CheckCircle size={12} /> Tersimpan
                </span>
              )}
              {syncStatus === "offline" && (
                <span className="badge badge-danger" style={{ fontSize: "0.75rem" }}>
                  <WifiOff size={12} /> Offline (Disimpan di browser)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Timer */}
            <div className={`quiz-timer ${timeLeftSeconds < 300 ? "timer-warning" : ""}`}>
              <Clock size={18} />
              <span>{formattedTime}</span>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={enterFullscreen}
              className="btn btn-ghost btn-sm"
              style={{ color: "#cbd5e1" }}
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn btn-accent btn-sm"
              style={{ fontWeight: 700 }}
            >
              <Send size={14} /> Selesai Ujian
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid: Question Area + Palette Sidebar */}
      <div className="quiz-grid-layout">
        {/* Left / Center: Question Card */}
        <div>
          {currentQuestion ? (
            <div className="card" style={{ padding: 28, position: "relative" }}>
              {/* Question Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                  paddingBottom: 14,
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <span className="eyebrow">
                    Soal Nomor {currentIndex + 1} dari {totalQuestions}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleToggleFlag}
                    className={`btn btn-sm ${
                      answers[currentQuestion.id]?.isFlagged
                        ? "btn-secondary"
                        : "btn-outline"
                    }`}
                    style={{
                      color: answers[currentQuestion.id]?.isFlagged ? "#b45309" : "inherit",
                      borderColor: answers[currentQuestion.id]?.isFlagged ? "#f59e0b" : "var(--border-color)",
                    }}
                  >
                    <Flag size={14} fill={answers[currentQuestion.id]?.isFlagged ? "#f59e0b" : "none"} />
                    {answers[currentQuestion.id]?.isFlagged ? "Ditandai Ragu" : "Ragu-ragu"}
                  </button>

                  {answers[currentQuestion.id]?.selectedOptionId && (
                    <button
                      onClick={handleClearAnswer}
                      className="btn btn-ghost btn-sm"
                      title="Hapus pilihan"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <RotateCcw size={14} /> Hapus Jawaban
                    </button>
                  )}
                </div>
              </div>

              {/* Stem (Question Content) */}
              <div
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  color: "var(--text-primary)",
                  marginBottom: 22,
                }}
              >
                {currentQuestion.stem}
              </div>

              {/* Options List (A - E) */}
              <div style={{ display: "grid", gap: 10 }}>
                {currentQuestion.options.map((opt) => {
                  const isSelected =
                    answers[currentQuestion.id]?.selectedOptionId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`option-item ${isSelected ? "selected" : ""}`}
                    >
                      <span className="option-letter">{opt.label}</span>
                      <span style={{ fontSize: "0.94rem", lineHeight: 1.5, paddingTop: 3 }}>
                        {opt.content}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 28,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="btn btn-outline"
                >
                  <ChevronLeft size={18} /> Sebelumnya
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="btn btn-primary"
                  >
                    Selanjutnya <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="btn btn-accent"
                  >
                    <Send size={16} /> Selesai & Kirim
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              Tidak ada soal tersedia.
            </div>
          )}
        </div>

        {/* Right: Question Palette Grid */}
        <div>
          <div className="card" style={{ padding: 20, position: "sticky", top: 80 }}>
            <h3 style={{ fontSize: "1.05rem", marginBottom: 14 }}>Daftar Nomor Soal</h3>

            {/* Summary Counters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 16,
                padding: "10px 12px",
                background: "var(--bg-surface-secondary)",
                borderRadius: "var(--radius-sm)",
                textAlign: "center",
                fontSize: "0.78rem",
                fontWeight: 700,
              }}
            >
              <div>
                <span style={{ color: "var(--text-primary)", display: "block", fontSize: "1.1rem" }}>
                  {answeredCount}
                </span>
                <span className="muted">Dijawab</span>
              </div>
              <div>
                <span style={{ color: "#d97706", display: "block", fontSize: "1.1rem" }}>
                  {flaggedCount}
                </span>
                <span className="muted">Ragu-ragu</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", display: "block", fontSize: "1.1rem" }}>
                  {unansweredCount}
                </span>
                <span className="muted">Kosong</span>
              </div>
            </div>

            {/* Palette Buttons */}
            <div className="palette-grid">
              {initialData.questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(ans?.selectedOptionId);
                const isFlagged = Boolean(ans?.isFlagged);

                let className = "palette-btn";
                if (isAnswered) className += " answered";
                if (isFlagged) className += " flagged";
                if (isCurrent) className += " current";

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={className}
                    title={`Soal ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary btn-lg"
                style={{ width: "100%", fontWeight: 700 }}
              >
                <Send size={16} /> Kumpulkan Ujian
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Violation Warning Modal */}
      {warningMessage && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header" style={{ background: "var(--danger-bg)" }}>
              <h3 style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 8, margin: 0, fontSize: "1.08rem" }}>
                <ShieldAlert size={20} /> Peringatan Keamanan
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.92rem", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
                {warningMessage}
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 10 }}>
                Jumlah rekaman pelanggaran keamanan: <strong>{violationCount}</strong>
                {policy.auto_submit_after_violations > 0 && (
                  <span> / Maksimal {policy.auto_submit_after_violations} kali</span>
                )}
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={enterFullscreen}
                className="btn btn-primary"
              >
                Saya Mengerti & Masuk Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.08rem" }}>Konfirmasi Pengumpulan Ujian</h3>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 14 }}>
                Apakah Anda yakin ingin menyelesaikan dan mengumpulkan ujian ini sekarang? Setelah dikumpulkan, Anda tidak dapat mengubah jawaban lagi.
              </p>

              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: 14,
                  borderRadius: "var(--radius-sm)",
                  display: "grid",
                  gap: 8,
                  fontSize: "0.88rem",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total Soal:</span>
                  <strong>{totalQuestions}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
                  <span>Soal Terjawab:</span>
                  <strong>{answeredCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#d97706" }}>
                  <span>Soal Ditandai Ragu:</span>
                  <strong>{flaggedCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}>
                  <span>Belum Terjawab:</span>
                  <strong>{unansweredCount}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="btn btn-outline"
              >
                Batal & Lanjut Mengerjakan
              </button>
              <button
                onClick={executeSubmit}
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ fontWeight: 700 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Mengumpulkan...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Ya, Kumpulkan Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
