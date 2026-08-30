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
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
  const hasEnteredFullscreenRef = useRef(false);
  const [violationCount, setViolationCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [securityToast, setSecurityToast] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);
  const securityToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showSecurityToast = useCallback((msg: string) => {
    if (securityToastTimerRef.current) clearTimeout(securityToastTimerRef.current);
    setSecurityToast(msg);
    securityToastTimerRef.current = setTimeout(() => {
      setSecurityToast(null);
    }, 2600);
  }, []);

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

  // Anti-Cheating Listeners (Desktop & Mobile Smartphone)
  useEffect(() => {
    // Add anti-selection and anti-touch-callout classes to html & body
    if (policy.disable_clipboard) {
      document.documentElement.classList.add("quiz-secure-lock");
      document.body.classList.add("quiz-secure-lock");
    }

    const isMobileDevice = () =>
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Initial fullscreen check on mount
    const initialFs = Boolean(
      document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
    );
    setIsFullscreen(initialFs);
    if (initialFs) {
      setHasEnteredFullscreen(true);
      hasEnteredFullscreenRef.current = true;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent("tab_hidden", {
          reason: "Pindah tab atau meminimalkan browser",
          is_mobile: isMobileDevice(),
        });
        setWarningMessage("Anda terdeteksi meninggalkan halaman ujian (pindah tab atau membuka aplikasi lain).");
      }
    };

    const handleWindowBlur = () => {
      if (policy.log_focus_loss) {
        logSecurityEvent("window_blur", {
          reason: "Jendela browser kehilangan fokus",
          is_mobile: isMobileDevice(),
        });
      }
    };

    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreen(inFullscreen);
      if (inFullscreen) {
        setHasEnteredFullscreen(true);
        hasEnteredFullscreenRef.current = true;
        setWarningMessage(null);
      } else if (policy.require_fullscreen && hasEnteredFullscreenRef.current) {
        // Only log violation if participant has already entered fullscreen and exited mid-exam
        logSecurityEvent("fullscreen_exit", {
          reason: "Keluar dari mode layar penuh",
          is_mobile: isMobileDevice(),
        });
        setWarningMessage("Anda keluar dari mode layar penuh. Klik tombol di bawah untuk kembali ke fullscreen.");
      }
    };

    const handleContextMenu = (e: MouseEvent | TouchEvent | Event) => {
      if (policy.disable_clipboard) {
        e.preventDefault();
        showSecurityToast("⚠️ Menu konteks dinonaktifkan demi keamanan ujian.");
        logSecurityEvent("clipboard_attempt", {
          action: "contextmenu",
          is_mobile: isMobileDevice(),
        });
      }
    };

    const handleClipboardAction = (e: ClipboardEvent) => {
      if (policy.disable_clipboard) {
        e.preventDefault();
        showSecurityToast("⚠️ Fitur salin/tempel (copy/paste) dinonaktifkan!");
        logSecurityEvent("clipboard_attempt", {
          action: e.type,
          is_mobile: isMobileDevice(),
        });
      }
    };

    const handleSelectStart = (e: Event) => {
      if (policy.disable_clipboard) {
        e.preventDefault();
      }
    };

    const handleSelectionChange = () => {
      if (!policy.disable_clipboard) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const text = selection.toString();
        if (text && text.trim().length > 0) {
          selection.removeAllRanges();
          if (typeof (selection as any).empty === "function") {
            (selection as any).empty();
          }
          showSecurityToast("⚠️ Seleksi teks dinonaktifkan!");
        }
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (policy.disable_clipboard) {
        e.preventDefault();
      }
    };

    // Mobile touch suppression for long-press selection & magnifier
    let touchHoldTimer: NodeJS.Timeout | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (!policy.disable_clipboard) return;

      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        sel.removeAllRanges();
      }

      if (e.touches.length === 1) {
        if (touchHoldTimer) clearTimeout(touchHoldTimer);
        touchHoldTimer = setTimeout(() => {
          const s = window.getSelection();
          if (s) s.removeAllRanges();
        }, 350);
      }
    };

    const handleTouchMove = () => {
      if (touchHoldTimer) {
        clearTimeout(touchHoldTimer);
        touchHoldTimer = null;
      }
    };

    const handleTouchEnd = () => {
      if (touchHoldTimer) {
        clearTimeout(touchHoldTimer);
        touchHoldTimer = null;
      }
      if (!policy.disable_clipboard) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        sel.removeAllRanges();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts: Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+P, Ctrl+U, Ctrl+S, Ctrl+A, F12, PrintScreen
      if (
        policy.disable_clipboard &&
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "p", "u", "s", "a"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        showSecurityToast("⚠️ Shortcut tombol salin/pilih dinonaktifkan!");
        logSecurityEvent("clipboard_attempt", { key: e.key, is_mobile: isMobileDevice() });
      }
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        showSecurityToast("⚠️ Akses DevTools dilarang.");
        logSecurityEvent("dev_tools_attempt", { is_mobile: isMobileDevice() });
      }
      if (e.key === "PrintScreen") {
        showSecurityToast("⚠️ Tangkapan layar dilarang.");
        logSecurityEvent("print_screen_attempt", { is_mobile: isMobileDevice() });
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
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleClipboardAction);
    document.addEventListener("cut", handleClipboardAction);
    document.addEventListener("paste", handleClipboardAction);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.documentElement.classList.remove("quiz-secure-lock");
      document.body.classList.remove("quiz-secure-lock");
      if (touchHoldTimer) clearTimeout(touchHoldTimer);
      if (securityToastTimerRef.current) clearTimeout(securityToastTimerRef.current);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleClipboardAction);
      document.removeEventListener("cut", handleClipboardAction);
      document.removeEventListener("paste", handleClipboardAction);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [policy, logSecurityEvent, flushOutbox, showSecurityToast]);

  const enterFullscreen = async () => {
    try {
      const docEl = document.documentElement as any;
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );

      if (!isCurrentlyFs) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
        setIsFullscreen(true);
        setHasEnteredFullscreen(true);
        hasEnteredFullscreenRef.current = true;
        setWarningMessage(null);
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen request error or unsupported:", err);
      // On devices where fullscreen API is not supported on documentElement, mark entered anyway
      setHasEnteredFullscreen(true);
      hasEnteredFullscreenRef.current = true;
      setWarningMessage(null);
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
    <div
      className={`quiz-wrapper ${policy.disable_clipboard ? "quiz-secure-lock" : ""}`}
      style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}
    >
      {/* Sticky Quiz Header */}
      <header className="quiz-header">
        <div className="quiz-header-inner">
          {/* Desktop Left: Exam Title & Sync Badge */}
          <div className="quiz-header-left-desktop">
            <h2 className="quiz-header-title" title={initialData.title}>
              {initialData.title}
            </h2>
            <div className="quiz-header-sync">
              {syncStatus === "saving" && (
                <span className="badge badge-warning" style={{ fontSize: "0.72rem", padding: "3px 8px" }}>
                  <Loader2 size={11} className="animate-spin" /> Menyimpan...
                </span>
              )}
              {syncStatus === "saved" && (
                <span className="badge badge-success" style={{ fontSize: "0.72rem", padding: "3px 8px" }}>
                  <CheckCircle size={11} /> Tersimpan
                </span>
              )}
              {syncStatus === "offline" && (
                <span className="badge badge-danger" style={{ fontSize: "0.72rem", padding: "3px 8px" }}>
                  <WifiOff size={11} /> Offline
                </span>
              )}
            </div>
          </div>

          {/* Mobile Left: Quick Question Palette Trigger */}
          <div className="quiz-header-left-mobile">
            <button
              type="button"
              onClick={() => setShowMobilePalette(true)}
              className="quiz-mobile-nav-pill"
              title="Buka Daftar Nomor Soal"
            >
              <span style={{ fontWeight: 800 }}>No. {currentIndex + 1}</span>
              <span className="muted" style={{ fontSize: "0.75rem" }}>/ {totalQuestions} ▾</span>
            </button>
            {syncStatus === "saving" && <span className="quiz-dot-sync saving" title="Menyimpan..." />}
            {syncStatus === "offline" && <span className="quiz-dot-sync offline" title="Offline" />}
          </div>

          {/* Center / Right: Timer, Fullscreen, and Selesai Button */}
          <div className="quiz-header-right">
            {/* Timer */}
            <div
              className={`quiz-timer ${timeLeftSeconds < 300 ? "timer-warning" : ""}`}
              title="Sisa Waktu Ujian"
            >
              <Clock size={14} className="timer-icon" />
              <span>{formattedTime}</span>
            </div>

            {/* Desktop Fullscreen Toggle */}
            <button
              type="button"
              onClick={enterFullscreen}
              className="btn btn-ghost btn-sm desktop-only-btn"
              style={{ color: "var(--text-secondary)", padding: "5px 8px" }}
              title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="btn btn-accent btn-sm quiz-submit-header-btn"
            >
              <Send size={12} /> Selesai
            </button>
          </div>
        </div>

        {/* Live Answered Questions Progress Bar */}
        <div className="quiz-progress-track">
          <div
            className="quiz-progress-bar"
            style={{
              width: `${(answeredCount / Math.max(1, totalQuestions)) * 100}%`,
            }}
          />
        </div>
      </header>

      {/* Main Grid: Question Area + Palette Sidebar (Desktop) */}
      <div className="quiz-grid-layout">
        {/* Center: Question Card */}
        <main className="quiz-main-area">
          {currentQuestion ? (
            <div className="card quiz-question-card">
              {/* Question Card Header */}
              <div className="quiz-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="quiz-number-badge">
                    Soal #{currentIndex + 1}
                  </span>
                  <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    dari {totalQuestions} Soal
                  </span>
                  {currentQuestion.scoring_mode === "option_value" && (
                    <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
                      Poin 1-5
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleToggleFlag}
                    className={`btn btn-sm ${
                      answers[currentQuestion.id]?.isFlagged
                        ? "btn-secondary"
                        : "btn-outline"
                    }`}
                    style={{
                      fontSize: "0.8rem",
                      padding: "5px 10px",
                      color: answers[currentQuestion.id]?.isFlagged ? "#b45309" : "inherit",
                      borderColor: answers[currentQuestion.id]?.isFlagged ? "#f59e0b" : "var(--border-color)",
                      background: answers[currentQuestion.id]?.isFlagged ? "#fef3c7" : "transparent",
                    }}
                  >
                    <Flag size={13} fill={answers[currentQuestion.id]?.isFlagged ? "#f59e0b" : "none"} />
                    <span>{answers[currentQuestion.id]?.isFlagged ? "Ragu-ragu" : "Tandai Ragu"}</span>
                  </button>

                  {answers[currentQuestion.id]?.selectedOptionId && (
                    <button
                      type="button"
                      onClick={handleClearAnswer}
                      className="btn btn-ghost btn-sm"
                      title="Reset / Kosongkan Pilihan"
                      style={{ color: "var(--text-muted)", fontSize: "0.78rem", padding: "5px 8px" }}
                    >
                      <RotateCcw size={13} />
                      <span className="desktop-inline">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Stem (Question Content) */}
              <div className="quiz-stem-content">
                {currentQuestion.stem}
              </div>

              {/* Options List (A - E) */}
              <div className="quiz-options-list">
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
                      <span className="option-content-text">
                        {opt.content}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="quiz-nav-footer">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="btn btn-outline quiz-nav-btn"
                >
                  <ChevronLeft size={16} /> Sebelumnya
                </button>

                {/* Mobile Palette Trigger inside Card Footer */}
                <button
                  type="button"
                  onClick={() => setShowMobilePalette(true)}
                  className="btn btn-ghost btn-sm mobile-only-inline"
                  style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--brand-accent)" }}
                >
                  📑 No. Soal ({answeredCount}/{totalQuestions})
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="btn btn-primary quiz-nav-btn"
                  >
                    Selanjutnya <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="btn btn-accent quiz-nav-btn"
                    style={{ fontWeight: 800 }}
                  >
                    <Send size={15} /> Selesai & Kirim
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              Tidak ada soal tersedia.
            </div>
          )}
        </main>

        {/* Right: Question Palette Sidebar (Desktop Only) */}
        <aside className="quiz-sidebar-desktop">
          <div className="card quiz-palette-card">
            <h3 style={{ fontSize: "1rem", margin: "0 0 12px", fontWeight: 800 }}>
              Daftar Nomor Soal
            </h3>

            {/* Summary Counters */}
            <div className="palette-summary-box">
              <div>
                <span className="palette-stat-number answered">{answeredCount}</span>
                <span className="palette-stat-label">Dijawab</span>
              </div>
              <div>
                <span className="palette-stat-number flagged">{flaggedCount}</span>
                <span className="palette-stat-label">Ragu</span>
              </div>
              <div>
                <span className="palette-stat-number unanswered">{unansweredCount}</span>
                <span className="palette-stat-label">Kosong</span>
              </div>
            </div>

            {/* Palette Buttons Grid */}
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
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={className}
                    title={`Soal Nomor ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary btn-lg"
                style={{ width: "100%", fontWeight: 800, fontSize: "0.88rem" }}
              >
                <Send size={15} /> Kumpulkan Ujian
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Question Palette Bottom Sheet / Drawer */}
      {showMobilePalette && (
        <div className="modal-backdrop" onClick={() => setShowMobilePalette(false)}>
          <div
            className="quiz-mobile-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quiz-drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                  Daftar Nomor Soal
                </h3>
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  Pilih nomor butir soal untuk berpindah
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px 8px", fontSize: "0.85rem" }}
              >
                ✕ Tutup
              </button>
            </div>

            {/* Summary Counters */}
            <div className="palette-summary-box" style={{ margin: "10px 16px 14px" }}>
              <div>
                <span className="palette-stat-number answered">{answeredCount}</span>
                <span className="palette-stat-label">Dijawab</span>
              </div>
              <div>
                <span className="palette-stat-number flagged">{flaggedCount}</span>
                <span className="palette-stat-label">Ragu</span>
              </div>
              <div>
                <span className="palette-stat-number unanswered">{unansweredCount}</span>
                <span className="palette-stat-label">Kosong</span>
              </div>
            </div>

            {/* Mobile Numbers Grid */}
            <div className="quiz-drawer-grid-container">
              <div className="palette-grid mobile-palette-grid">
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
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowMobilePalette(false);
                      }}
                      className={className}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Bottom Submit Action */}
            <div className="quiz-drawer-footer">
              <button
                type="button"
                onClick={() => {
                  setShowMobilePalette(false);
                  setShowSubmitModal(true);
                }}
                className="btn btn-primary"
                style={{ width: "100%", fontWeight: 800 }}
              >
                <Send size={15} /> Kumpulkan Jawaban Ujian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Fullscreen Gate Modal */}
      {policy.require_fullscreen && !isFullscreen && !hasEnteredFullscreen && (
        <div className="modal-backdrop" style={{ zIndex: 99999 }}>
          <div className="modal-card" style={{ maxWidth: 460, width: "100%", margin: "auto", textAlign: "center" }}>
            <div className="modal-body" style={{ padding: "32px 24px" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--brand-light)",
                  color: "var(--brand-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Maximize2 size={28} />
              </div>
              <h2 style={{ fontSize: "1.25rem", margin: "0 0 8px", fontWeight: 800 }}>
                Mode Layar Penuh (Fullscreen)
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 20px" }}>
                Simulasi ujian ini berjalan dalam mode layar penuh untuk memastikan kenyamanan pengerjaan dan keamanan data soal.
              </p>
              <button
                type="button"
                onClick={enterFullscreen}
                className="btn btn-primary btn-lg"
                style={{ width: "100%", justifyContent: "center", fontWeight: 800 }}
              >
                <Maximize2 size={18} /> Masuk Fullscreen & Mulai Ujian
              </button>
            </div>
          </div>
        </div>
      )}

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
                type="button"
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
          <div className="modal-card" style={{ maxWidth: 440, width: "100%", margin: "0 auto" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.08rem" }}>Konfirmasi Kumpulkan Ujian</h3>
            </div>
            <div className="modal-body" style={{ padding: "16px 18px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: 12, lineHeight: 1.5 }}>
                Apakah Anda yakin ingin mengumpulkan ujian ini? Setelah dikumpulkan, jawaban akan langsung dinilai dan tidak dapat diubah lagi.
              </p>

              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  display: "grid",
                  gap: 6,
                  fontSize: "0.85rem",
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
            <div
              className="modal-footer"
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "flex-end",
                padding: "12px 18px 16px",
              }}
            >
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="btn btn-outline btn-sm"
                style={{ flex: "1 1 100px", justifyContent: "center" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                disabled={isSubmitting}
                className="btn btn-primary btn-sm"
                style={{ flex: "1 1 140px", fontWeight: 700, justifyContent: "center" }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Mengumpulkan...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Ya, Kumpulkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Block Toast Notification */}
      {securityToast && (
        <div className="quiz-toast-warning">
          <ShieldAlert size={16} />
          <span>{securityToast}</span>
        </div>
      )}
    </div>
  );
}

