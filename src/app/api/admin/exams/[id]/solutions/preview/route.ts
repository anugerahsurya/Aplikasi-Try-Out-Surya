import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateMasterExamPdf, ExamPdfData } from "@/lib/pdf/exam-pdf";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase: userSupabase } = await requireAdmin();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let examQuery = userSupabase.from("exams").select("*");
    if (isUuid) {
      examQuery = examQuery.eq("id", id);
    } else {
      examQuery = examQuery.eq("slug", id);
    }
    const { data: exam } = await examQuery.maybeSingle();

    if (!exam) {
      return new NextResponse("Ujian tidak ditemukan", { status: 404 });
    }

    let pdfBytes: Uint8Array;

    // Check if stored in DB
    if (exam.explanation_pdf) {
      pdfBytes = Buffer.from(exam.explanation_pdf, "base64");
    } else {
      // Generate on the fly
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
        questions: (questions || []).map((q: any) => ({
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

      pdfBytes = await generateMasterExamPdf(pdfData);
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Pembahasan_${exam.slug || "Ujian"}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Error in preview route:", err);
    return new NextResponse("Gagal memuat PDF", { status: 500 });
  }
}
