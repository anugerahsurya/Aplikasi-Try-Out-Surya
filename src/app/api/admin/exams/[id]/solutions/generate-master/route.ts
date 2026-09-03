import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateMasterExamPdf, ExamPdfData } from "@/lib/pdf/exam-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase: userSupabase } = await requireAdmin();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 1. Fetch exam details
    let examQuery = userSupabase.from("exams").select("*");
    if (isUuid) {
      examQuery = examQuery.eq("id", id);
    } else {
      examQuery = examQuery.eq("slug", id);
    }
    const { data: exam, error: examErr } = await examQuery.maybeSingle();

    if (examErr || !exam) {
      return NextResponse.json({ error: "Ujian tidak ditemukan." }, { status: 404 });
    }

    // 2. Fetch sections and questions with options
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
      return NextResponse.json(
        { error: "Ujian ini belum memiliki butir soal untuk dibuatkan pembahasan." },
        { status: 400 }
      );
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

    // 3. Generate Master PDF
    const pdfBytes = await generateMasterExamPdf(pdfData);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // 4. Save to database exams table
    const adminSupabase = createAdminClient();
    const activeClient =
      process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
        ? adminSupabase
        : userSupabase;

    const { error: updateErr } = await activeClient
      .from("exams")
      .update({
        explanation_pdf: pdfBase64,
        explanation_pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", exam.id);

    if (updateErr) {
      console.error("Error saving master PDF to DB:", updateErr);
      // Even if update column failed (e.g. column not yet added), still return success with base64 for preview
      return NextResponse.json({
        success: true,
        message: "PDF Master Pembahasan berhasil di-generate.",
        pdfBase64,
        db_warning: "Kolom explanation_pdf belum ada di database, silakan jalankan migrasi SQL.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "PDF Master Pembahasan berhasil dibuat dan disimpan di database.",
      generated_at: new Date().toISOString(),
      size_bytes: pdfBytes.byteLength,
    });
  } catch (err: any) {
    console.error("Error in generate-master route:", err);
    return NextResponse.json({ error: err?.message || "Gagal membuat master PDF." }, { status: 500 });
  }
}
