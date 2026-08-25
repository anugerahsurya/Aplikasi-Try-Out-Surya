import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Monitor,
  Trophy,
  Download,
} from "lucide-react";
import { Attempt, Exam, Profile, AttemptEvent } from "@/types";
import { calculateQuestionScore } from "@/lib/scoring";

import { ResetAttemptButton } from "@/components/admin/ResetAttemptButton";

export default async function AdminAttemptAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireAdmin();

  // Fetch attempt with exam and profile
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("*, exam:exams(*), profile:profiles(*)")
    .eq("id", id)
    .single();

  if (attemptError || !attempt) {
    notFound();
  }

  // Fetch attempt events (audit timeline)
  const { data: events } = await supabase
    .from("attempt_events")
    .select("*")
    .eq("attempt_id", id)
    .order("occurred_at", { ascending: true });

  // Fetch snapshots and answers
  const { data: snapshots } = await supabase
    .from("attempt_question_snapshots")
    .select("*")
    .eq("attempt_id", id)
    .order("position", { ascending: true });

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select("*")
    .eq("attempt_id", id);

  const answerMap = new Map<string, string | null>();
  (answers || []).forEach((a: any) => {
    answerMap.set(a.question_id, a.selected_option_id);
  });

  const exam = attempt.exam as Exam;
  const participant = attempt.profile as Profile;

  const eventList = (events || []) as AttemptEvent[];
  const violationEvents = eventList.filter((e) =>
    ["tab_hidden", "fullscreen_exit", "window_blur", "clipboard_attempt", "dev_tools_attempt"].includes(
      e.event_type
    )
  );

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <Link
          href="/admin/dashboard"
          className="btn btn-ghost btn-sm"
          style={{ paddingLeft: 0 }}
        >
          <ArrowLeft size={16} /> Kembali ke Ringkasan
        </Link>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ResetAttemptButton
            attemptId={attempt.id}
            studentName={participant?.full_name || "Peserta"}
            examTitle={exam?.title}
            redirectUrlOnSuccess="/admin/dashboard"
            variant="outline"
          />
          {exam?.id && (
            <>
              <Link
                href={`/admin/exams/${exam.id}/leaderboard`}
                className="btn btn-outline btn-sm"
              >
                <Trophy size={14} color="#d97706" /> Lihat Rekap Nilai
              </Link>
              <a
                href={`/api/admin/exams/${exam.id}/export`}
                download
                className="btn btn-primary btn-sm"
              >
                <Download size={14} /> Unduh Excel (.csv)
              </a>
            </>
          )}
        </div>
      </div>

        {/* Top Summary Card */}
        <section className="card-navy" style={{ padding: "32px 28px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="eyebrow" style={{ color: "#93c5fd" }}>
                Audit Sesi Pengerjaan Ujian
              </span>
              <h1 style={{ color: "#ffffff", fontSize: "1.75rem", margin: "4px 0 8px" }}>
                {exam?.title}
              </h1>
              <p style={{ color: "#cbd5e1", fontSize: "0.92rem", margin: 0 }}>
                Peserta: <strong>{participant?.full_name || "Peserta"}</strong> ({participant?.email})
              </p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "10px 18px", borderRadius: 10, textAlign: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block" }}>Total Skor</span>
                <strong style={{ fontSize: "1.4rem", color: "#ffffff" }}>{attempt.score ?? "—"}</strong>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "10px 18px", borderRadius: 10, textAlign: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block" }}>Pelanggaran</span>
                <strong style={{ fontSize: "1.4rem", color: attempt.violation_count > 0 ? "#fca5a5" : "#4ade80" }}>
                  {attempt.violation_count}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* Security Audit Timeline */}
        <section className="card" style={{ padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={20} color="var(--danger)" /> Timeline Audit Anti-Kecurangan ({eventList.length} Event)
            </h3>
            <span className={`badge ${violationEvents.length > 0 ? "badge-danger" : "badge-success"}`}>
              {violationEvents.length > 0 ? `${violationEvents.length} Pelanggaran Terdeteksi` : "Aman / Tidak Ada Pelanggaran"}
            </span>
          </div>

          {eventList.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", background: "var(--navy-50)", borderRadius: 8 }}>
              Tidak ada rekaman event keamanan tercatat pada sesi ini.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {eventList.map((ev) => {
                const isViolation = [
                  "tab_hidden",
                  "fullscreen_exit",
                  "window_blur",
                  "clipboard_attempt",
                  "dev_tools_attempt",
                ].includes(ev.event_type);

                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: isViolation ? "var(--danger-bg)" : "var(--navy-50)",
                      border: `1px solid ${isViolation ? "#fca5a5" : "var(--line)"}`,
                      fontSize: "0.88rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {isViolation ? (
                        <AlertTriangle size={16} color="var(--danger)" />
                      ) : (
                        <CheckCircle2 size={16} color="var(--navy-600)" />
                      )}
                      <div>
                        <strong style={{ color: isViolation ? "var(--danger)" : "var(--navy-900)" }}>
                          {ev.event_type.replace(/_/g, " ").toUpperCase()}
                        </strong>
                        {ev.metadata?.reason && (
                          <span className="muted" style={{ marginLeft: 8 }}>
                            — {ev.metadata.reason}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="muted" style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>
                      {new Date(ev.occurred_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Answers and Score Breakdown */}
        {snapshots && snapshots.length > 0 && (
          <section className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: 18 }}>Lembar Jawaban & Analisis Skor</h3>

            <div style={{ display: "grid", gap: 16 }}>
              {snapshots.map((s: any, idx: number) => {
                const selectedOptionId = answerMap.get(s.question_id);
                const earned = calculateQuestionScore(
                  {
                    scoring_mode: s.scoring_mode,
                    correct_score: s.correct_score,
                    incorrect_score: s.incorrect_score,
                    blank_score: s.blank_score,
                    options: s.options || [],
                  },
                  selectedOptionId
                );

                return (
                  <div
                    key={s.question_id}
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--line)",
                      background: "var(--canvas)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span className="eyebrow">Nomor {idx + 1} ({s.scoring_mode})</span>
                      <span className="badge badge-navy">Poin Diperoleh: {earned}</span>
                    </div>

                    <p style={{ margin: "4px 0 12px", fontSize: "0.95rem" }}>{s.stem}</p>

                    <div style={{ display: "grid", gap: 6 }}>
                      {(s.options || []).map((opt: any) => {
                        const isChosen = selectedOptionId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: isChosen ? "var(--navy-100)" : "#ffffff",
                              border: `1px solid ${isChosen ? "var(--navy-800)" : "var(--line)"}`,
                              fontSize: "0.85rem",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>
                              <strong>{opt.label}.</strong> {opt.content}
                            </span>
                            <div>
                              {s.scoring_mode === "option_value" && (
                                <span className="muted" style={{ marginRight: 8 }}>
                                  Skor Opsi: {opt.score_value ?? 0}
                                </span>
                              )}
                              {isChosen && (
                                <strong style={{ color: "var(--navy-900)" }}>[Pilihan Peserta]</strong>
                              )}
                              {opt.is_correct && (
                                <strong style={{ color: "var(--success)", marginLeft: 6 }}>[Kunci]</strong>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
  );
}
