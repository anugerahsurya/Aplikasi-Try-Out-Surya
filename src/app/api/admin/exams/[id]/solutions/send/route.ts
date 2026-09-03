import { requireAdmin } from "@/lib/auth";
import { generateMasterExamPdf, ExamPdfData } from "@/lib/pdf/exam-pdf";
import { mergeEvaluationWithMasterPdf } from "@/lib/pdf/merge-evaluation";
import { generatePersonalEvaluation, ParticipantExamPerformance } from "@/lib/ai/evaluation-service";
import { sendSolutionEmail } from "@/lib/email/send-solutions-email";
import { calculateQuestionScore } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const encoder = new TextEncoder();

  // Create stream to stream real-time progress events to client
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: any) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
    } catch {}
  };

  // Run async processing in background of stream
  (async () => {
    try {
      const { id } = await params;
      const { supabase: userSupabase } = await requireAdmin();

      await sendEvent({
        type: "progress",
        percent: 5,
        stage: "Persiapan",
        message: "Memvalidasi hak akses dan mengambil data ujian...",
      });

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let body: any = {};
      try {
        body = await req.json();
      } catch {}

      const targetAttemptId = body?.attempt_id;

      // 1. Fetch Exam
      let examQuery = userSupabase.from("exams").select("*");
      if (isUuid) {
        examQuery = examQuery.eq("id", id);
      } else {
        examQuery = examQuery.eq("slug", id);
      }
      const { data: exam, error: examErr } = await examQuery.maybeSingle();

      if (examErr || !exam) {
        await sendEvent({
          type: "error",
          percent: 0,
          stage: "Error",
          message: "Ujian tidak ditemukan.",
        });
        await writer.close();
        return;
      }

      // 2. Fetch or Generate Master PDF
      await sendEvent({
        type: "progress",
        percent: 15,
        stage: "Master PDF",
        message: "Menyiapkan Master PDF Pembahasan Ujian...",
      });

      let masterPdfBytes: Uint8Array;

      if (exam.explanation_pdf) {
        masterPdfBytes = Buffer.from(exam.explanation_pdf, "base64");
        await sendEvent({
          type: "log",
          message: "Master PDF berhasil dimuat dari database.",
        });
      } else {
        await sendEvent({
          type: "log",
          message: "Membuat Master PDF pembahasan baru dari butir-butir soal...",
        });

        const [
          { data: sections },
          { data: questions },
        ] = await Promise.all([
          userSupabase.from("exam_sections").select("*").eq("exam_id", exam.id).order("position", { ascending: true }),
          userSupabase
            .from("questions")
            .select("*, question_options(*)")
            .eq("exam_id", exam.id)
            .order("position", { ascending: true }),
        ]);

        if (!questions || questions.length === 0) {
          await sendEvent({
            type: "error",
            percent: 15,
            stage: "Error",
            message: "Ujian ini belum memiliki soal untuk dibuatkan pembahasan.",
          });
          await writer.close();
          return;
        }

        const sectionMap = new Map<string, string>();
        (sections || []).forEach((s: any) => {
          sectionMap.set(s.id, s.title);
        });

        const pdfData: ExamPdfData = {
          id: exam.id,
          title: exam.title,
          slug: exam.slug,
          description: exam.description,
          duration_minutes: exam.duration_minutes,
          questions: questions.map((q: any) => ({
            id: q.id,
            position: q.position,
            stem: q.stem,
            scoring_mode: q.scoring_mode,
            correct_score: q.correct_score,
            incorrect_score: q.incorrect_score,
            blank_score: q.blank_score,
            explanation: q.explanation,
            section_title: q.section_id ? sectionMap.get(q.section_id) || null : null,
            options: (q.question_options || [])
              .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
              .map((opt: any) => ({
                label: opt.label,
                content: opt.content,
                is_correct: opt.is_correct,
                score_value: opt.score_value,
              })),
          })),
        };

        masterPdfBytes = await generateMasterExamPdf(pdfData);

        const adminSupabase = createAdminClient();
        const activeClient =
          process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
            ? adminSupabase
            : userSupabase;

        await activeClient
          .from("exams")
          .update({
            explanation_pdf: Buffer.from(masterPdfBytes).toString("base64"),
            explanation_pdf_generated_at: new Date().toISOString(),
          })
          .eq("id", exam.id);

        await sendEvent({
          type: "log",
          message: "Master PDF berhasil disimpan ke database.",
        });
      }

      // 3. Fetch Completed Attempts
      await sendEvent({
        type: "progress",
        percent: 25,
        stage: "Memuat Peserta",
        message: "Mengambil daftar peserta yang telah menyelesaikan ujian...",
      });

      let attemptsQuery = userSupabase
        .from("attempts")
        .select("*, profile:profiles(full_name, email)")
        .eq("exam_id", exam.id)
        .in("status", ["submitted", "expired"]);

      if (targetAttemptId) {
        attemptsQuery = attemptsQuery.eq("id", targetAttemptId);
      }

      const { data: attempts, error: attemptsErr } = await attemptsQuery;

      if (attemptsErr || !attempts || attempts.length === 0) {
        await sendEvent({
          type: "error",
          percent: 25,
          stage: "Selesai",
          message: "Tidak ada peserta yang telah menyelesaikan ujian ini untuk dikirimi pembahasan.",
        });
        await writer.close();
        return;
      }

      const totalParticipants = attempts.length;
      await sendEvent({
        type: "log",
        message: `Ditemukan ${totalParticipants} peserta untuk diproses.`,
      });

      // Fetch sections for grouping
      const { data: allSections } = await userSupabase
        .from("exam_sections")
        .select("id, title")
        .eq("exam_id", exam.id);
      const secNameMap = new Map<string, string>();
      (allSections || []).forEach((s: any) => {
        secNameMap.set(s.id, s.title);
      });

      const results: { studentName: string; email: string; success: boolean; error?: string }[] = [];

      // 4. Process Each Participant with Strict AI Validation & Live Progress
      const baseProgress = 25;
      const progressRange = 70; // From 25% to 95%

      for (let i = 0; i < totalParticipants; i++) {
        const attempt = attempts[i];
        const studentName = (attempt.profile as any)?.full_name || "Peserta Ujian";
        const studentEmail = (attempt.profile as any)?.email;
        const participantProgress = Math.round(baseProgress + ((i + 0.1) / totalParticipants) * progressRange);

        if (!studentEmail) {
          results.push({ studentName, email: "N/A", success: false, error: "Email peserta tidak ditemukan." });
          await sendEvent({
            type: "log",
            percent: participantProgress,
            stage: "Lewati",
            message: `⚠️ [${i + 1}/${totalParticipants}] ${studentName}: Dilewati karena email tidak ditemukan.`,
          });
          continue;
        }

        await sendEvent({
          type: "progress",
          percent: participantProgress,
          stage: "Evaluasi AI Gemini",
          studentName,
          message: `[${i + 1}/${totalParticipants}] Menganalisis performa & generate evaluasi Gemini 3.5 Flash-Lite untuk ${studentName}...`,
        });

        try {
          // Fetch answers & snapshots
          const [
            { data: snapshots },
            { data: answers },
          ] = await Promise.all([
            userSupabase
              .from("attempt_question_snapshots")
              .select("*")
              .eq("attempt_id", attempt.id)
              .order("position", { ascending: true }),
            userSupabase
              .from("attempt_answers")
              .select("*")
              .eq("attempt_id", attempt.id),
          ]);

          const answerMap = new Map<string, string | null>();
          (answers || []).forEach((a: any) => {
            answerMap.set(a.question_id, a.selected_option_id);
          });

          let correctCount = 0;
          let incorrectCount = 0;
          let blankCount = 0;
          const sectionStats: Record<string, { title: string; score: number; count: number; correct: number }> = {};
          const weakTopics: string[] = [];

          (snapshots || []).forEach((s: any) => {
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

            const isBlank = !selectedOptionId;
            const isCorrect = earned > 0;

            if (isBlank) blankCount++;
            else if (isCorrect) correctCount++;
            else {
              incorrectCount++;
              if (s.stem && weakTopics.length < 5) {
                const snippet = s.stem.length > 50 ? s.stem.substring(0, 48) + "..." : s.stem;
                weakTopics.push(snippet);
              }
            }

            const secKey = s.section_id || "Umum";
            const secTitle = secNameMap.get(secKey) || "Kemampuan Umum";
            if (!sectionStats[secKey]) {
              sectionStats[secKey] = { title: secTitle, score: 0, count: 0, correct: 0 };
            }
            sectionStats[secKey].score += earned;
            sectionStats[secKey].count += 1;
            if (isCorrect) sectionStats[secKey].correct += 1;
          });

          const performance: ParticipantExamPerformance = {
            studentName,
            email: studentEmail,
            examTitle: exam.title,
            totalScore: attempt.score ?? 0,
            totalQuestions: snapshots?.length || 0,
            answeredCount: (snapshots?.length || 0) - blankCount,
            correctCount,
            incorrectCount,
            blankCount,
            sectionBreakdown: Object.values(sectionStats).map((st) => ({
              sectionTitle: st.title,
              earnedScore: st.score,
              questionCount: st.count,
              correctCount: st.correct,
            })),
            weakTopics,
          };

          // STRICT AI GENERATION: If AI fails, throw and DO NOT send email!
          const evaluation = await generatePersonalEvaluation(performance, { strictAi: true });

          await sendEvent({
            type: "log",
            message: `✅ Evaluasi AI Gemini selesai untuk ${studentName}. Menggabungkan lembar evaluasi ke PDF...`,
          });

          // Merge evaluation page with master PDF
          const personalMergedPdf = await mergeEvaluationWithMasterPdf({
            masterPdfBytes,
            evaluation,
            performance,
          });

          await sendEvent({
            type: "progress",
            percent: Math.round(baseProgress + ((i + 0.7) / totalParticipants) * progressRange),
            stage: "Kirim Email",
            studentName,
            message: `[${i + 1}/${totalParticipants}] Mengirimkan email via SMTP ke ${studentEmail}...`,
          });

          // Send Email via SMTP
          const emailResult = await sendSolutionEmail({
            to: studentEmail,
            studentName,
            examTitle: exam.title,
            examPackage: exam.slug,
            score: attempt.score ?? 0,
            completedAt: attempt.submitted_at || attempt.created_at,
            summaryText: evaluation.summary,
            pdfAttachmentBuffer: Buffer.from(personalMergedPdf),
            pdfFilename: `Pembahasan_${exam.slug}_${studentName.replace(/\s+/g, "_")}.pdf`,
          });

          if (emailResult.success) {
            results.push({ studentName, email: studentEmail, success: true });
            await sendEvent({
              type: "log",
              message: `🎉 [${i + 1}/${totalParticipants}] Berhasil terkirim ke ${studentName} (${studentEmail}).`,
            });
          } else {
            results.push({ studentName, email: studentEmail, success: false, error: emailResult.error });
            await sendEvent({
              type: "log",
              message: `❌ [${i + 1}/${totalParticipants}] Gagal mengirim SMTP ke ${studentName}: ${emailResult.error}`,
            });
          }
        } catch (procErr: any) {
          // CRITICAL: If AI generation failed, DO NOT SEND EMAIL!
          const errMsg = procErr?.message || "Gagal memproses evaluasi AI";
          console.error(`AI Evaluation / Process Failed for ${studentEmail}:`, errMsg);
          results.push({
            studentName,
            email: studentEmail,
            success: false,
            error: `Batal dikirim: ${errMsg}`,
          });

          await sendEvent({
            type: "log",
            stage: "AI Gagal (Batal Kirim)",
            message: `⚠️ [${i + 1}/${totalParticipants}] ${studentName}: ${errMsg}. Email TIDAK dikirimkan demi menjaga akurasi evaluasi.`,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      await sendEvent({
        type: "complete",
        percent: 100,
        stage: "Selesai",
        message: `Proses pengiriman selesai: ${successCount} berhasil dikirimkan, ${failCount} gagal/dibatalkan.`,
        totalSent: successCount,
        failedCount: failCount,
        details: results,
      });

      await writer.close();
    } catch (fatalErr: any) {
      console.error("Fatal error in solutions send stream:", fatalErr);
      await sendEvent({
        type: "error",
        percent: 0,
        stage: "Error Server",
        message: fatalErr?.message || "Terjadi kesalahan internal server.",
      });
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
