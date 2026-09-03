"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mail,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Send,
  ExternalLink,
  RefreshCw,
  Terminal,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface SendSolutionsModalProps {
  examId: string;
  examTitle: string;
  examSlug: string;
  hasMasterPdf?: boolean;
  eligibleCount?: number;
  buttonVariant?: "primary" | "outline" | "secondary";
  buttonSize?: "sm" | "md";
}

interface LogEntry {
  id: string;
  time: string;
  message: string;
  stage?: string;
  isError?: boolean;
  isWarning?: boolean;
  isSuccess?: boolean;
}

export function SendSolutionsModal({
  examId,
  examTitle,
  examSlug,
  hasMasterPdf = false,
  eligibleCount = 0,
  buttonVariant = "primary",
  buttonSize = "sm",
}: SendSolutionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  const [masterReady, setMasterReady] = useState(hasMasterPdf);

  // Streaming progress states
  const [isSending, setIsSending] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sendResult, setSendResult] = useState<{
    completed: boolean;
    success: boolean;
    message: string;
    totalSent?: number;
    failedCount?: number;
    details?: { studentName: string; email: string; success: boolean; error?: string }[];
  } | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (msg: string, stage?: string, isError = false, isWarning = false, isSuccess = false) => {
    const timeStr = new Date().toLocaleTimeString("id-ID", { hour12: false });
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        time: timeStr,
        message: msg,
        stage,
        isError,
        isWarning,
        isSuccess,
      },
    ]);
  };

  const handleGenerateMaster = async () => {
    setIsGeneratingMaster(true);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/solutions/generate-master`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setMasterReady(true);
        alert("Master PDF Pembahasan berhasil dibuat dan disimpan di database.");
      } else {
        alert(data.error || "Gagal membuat master PDF.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat membuat master PDF.");
    } finally {
      setIsGeneratingMaster(false);
    }
  };

  const handleSendEmails = async () => {
    setIsSending(true);
    setProgressPercent(2);
    setCurrentStage("Memulai");
    setCurrentMessage("Menyiapkan koneksi pengiriman...");
    setLogs([]);
    setSendResult(null);

    addLog("Inisialisasi proses pengiriman pembahasan & evaluasi AI...");

    try {
      const res = await fetch(`/api/admin/exams/${examId}/solutions/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Gagal memulai pengiriman (Status: ${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.percent !== undefined) {
              setProgressPercent(event.percent);
            }
            if (event.stage) {
              setCurrentStage(event.stage);
            }
            if (event.message) {
              setCurrentMessage(event.message);
              const isErr = event.type === "error" || event.message.includes("❌");
              const isWarn = event.message.includes("⚠️");
              const isSucc = event.type === "complete" || event.message.includes("🎉") || event.message.includes("✅");
              addLog(event.message, event.stage, isErr, isWarn, isSucc);
            }

            if (event.type === "complete") {
              setSendResult({
                completed: true,
                success: true,
                message: event.message,
                totalSent: event.totalSent,
                failedCount: event.failedCount,
                details: event.details,
              });
            } else if (event.type === "error") {
              setSendResult({
                completed: true,
                success: false,
                message: event.message || "Terjadi kesalahan selama pengiriman.",
              });
            }
          } catch (jsonErr) {
            console.warn("Parse line error:", jsonErr, line);
          }
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || "Terjadi kesalahan koneksi saat pengiriman.";
      addLog(errMsg, "Error", true);
      setSendResult({
        completed: true,
        success: false,
        message: errMsg,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setSendResult(null);
          setLogs([]);
          setProgressPercent(0);
          setCurrentStage("");
          setCurrentMessage("");
        }}
        className={`btn btn-${buttonVariant} btn-${buttonSize}`}
        style={{ fontWeight: 700 }}
      >
        <Mail size={buttonSize === "sm" ? 14 : 16} /> Kirim Pembahasan
      </button>

      {isOpen && (
        <div className="modal-backdrop" style={{ zIndex: 99999 }}>
          <div className="modal-card" style={{ maxWidth: 640, width: "100%", margin: "auto" }}>
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border-color)",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(14, 165, 233, 0.15)",
                    color: "var(--brand-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800 }}>
                    Kirim Pembahasan & Evaluasi Personal AI
                  </h3>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    Didukung Google Gemini 3.5 Flash-Lite & SMTP Mailer
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSending) setIsOpen(false);
                }}
                disabled={isSending}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "1.1rem", padding: "4px 8px" }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: "20px", display: "grid", gap: 16 }}>
              {/* Exam Info Card */}
              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.85rem",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted">Judul Ujian:</span>
                  <strong>{examTitle}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted">Paket Ujian:</span>
                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                    {examSlug}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted">Total Peserta Selesai:</span>
                  <span style={{ color: "var(--brand-accent)", fontWeight: 800 }}>
                    {eligibleCount} Peserta
                  </span>
                </div>
              </div>

              {/* Master PDF Card */}
              {!isSending && !sendResult && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={16} color="var(--brand-accent)" />
                      <strong style={{ fontSize: "0.88rem" }}>Master Dokumen Pembahasan</strong>
                    </div>
                    <p className="muted" style={{ fontSize: "0.78rem", margin: "3px 0 0" }}>
                      {masterReady
                        ? "Master PDF tersimpan di database (siap dimerge)."
                        : "Master PDF belum dibuat. Akan otomatis di-generate."}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {masterReady && (
                      <a
                        href={`/api/admin/exams/${examId}/solutions/preview`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: "0.78rem" }}
                      >
                        <ExternalLink size={12} /> Preview PDF
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateMaster}
                      disabled={isGeneratingMaster || isSending}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.78rem" }}
                    >
                      {isGeneratingMaster ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Membuat...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} /> {masterReady ? "Generate Ulang" : "Generate Master"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Safety Protection Notice */}
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <ShieldCheck size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: "var(--success)" }}>Pengamanan AI Aktif:</strong> Jika evaluasi AI
                  Gemini 3.5 Flash-Lite gagal untuk suatu peserta, email pembahasan <strong>TIDAK akan dikirimkan</strong> secara otomatis demi menjaga keakuratan analisis bagi peserta tersebut.
                </div>
              </div>

              {/* Real-time Progress Bar & Stage Indicator */}
              {(isSending || sendResult) && (
                <div
                  style={{
                    background: "var(--bg-surface)",
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isSending && <Loader2 size={15} className="animate-spin" color="var(--brand-accent)" />}
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                        {currentStage || "Proses Pengiriman"}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--brand-accent)" }}>
                      {progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div
                    style={{
                      height: 8,
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progressPercent}%`,
                        background: "linear-gradient(90deg, var(--brand-accent) 0%, #6366f1 100%)",
                        borderRadius: 99,
                        transition: "width 0.35s ease",
                      }}
                    />
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentMessage || "Sedang memproses..."}
                  </p>
                </div>
              )}

              {/* Live Terminal / Audit Log Box */}
              {(isSending || logs.length > 0) && (
                <div
                  style={{
                    background: "#050b14",
                    border: "1px solid #1e293b",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    fontFamily: "monospace",
                    fontSize: "0.76rem",
                    maxHeight: 180,
                    overflowY: "auto",
                    display: "grid",
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      borderBottom: "1px solid #1e293b",
                      paddingBottom: 6,
                      color: "#64748b",
                      fontSize: "0.72rem",
                    }}
                  >
                    <Terminal size={12} /> Live Progress Log
                  </div>

                  {logs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        color: log.isError ? "#ef4444" : log.isWarning ? "#f59e0b" : log.isSuccess ? "#10b981" : "#94a3b8",
                      }}
                    >
                      <span style={{ color: "#475569", flexShrink: 0 }}>[{log.time}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {/* Final Result Card */}
              {sendResult && (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "var(--radius-md)",
                    background: sendResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    border: `1px solid ${sendResult.success ? "var(--success)" : "var(--danger)"}`,
                    fontSize: "0.85rem",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {sendResult.success ? (
                      <CheckCircle2 size={18} color="var(--success)" />
                    ) : (
                      <AlertTriangle size={18} color="var(--danger)" />
                    )}
                    <strong>{sendResult.message}</strong>
                  </div>

                  {sendResult.details && sendResult.details.length > 0 && (
                    <div style={{ marginTop: 4, display: "grid", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                      {sendResult.details.map((d, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.78rem",
                            padding: "4px 8px",
                            background: "rgba(0, 0, 0, 0.2)",
                            borderRadius: 4,
                          }}
                        >
                          <span>
                            {d.studentName} ({d.email})
                          </span>
                          {d.success ? (
                            <span style={{ color: "var(--success)", fontWeight: 700 }}>Terkirim</span>
                          ) : (
                            <span style={{ color: "var(--danger)", fontWeight: 700 }}>{d.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "14px 20px 18px",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSending}
                className="btn btn-outline btn-sm"
              >
                {sendResult ? "Selesai & Tutup" : "Tutup"}
              </button>
              {!sendResult && (
                <button
                  type="button"
                  onClick={handleSendEmails}
                  disabled={isSending || isGeneratingMaster}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800 }}
                >
                  {isSending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sedang Memproses...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Mulai Pengiriman
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
