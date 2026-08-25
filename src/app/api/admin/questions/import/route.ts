import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const optionSchema = z.object({
  label: z.string().min(1),
  content: z.string().min(1),
  is_correct: z.boolean().optional().default(false),
  score_value: z.number().nullable().optional(),
});

const questionImportSchema = z.object({
  exam_id: z.string().uuid(),
  questions: z.array(
    z.object({
      section_title: z.string().optional().default("Bagian Utama"),
      stem: z.string().min(1, "Pertanyaan/stem wajib diisi"),
      scoring_mode: z.enum(["correctness", "option_value"]).default("correctness"),
      correct_score: z.number().default(5),
      incorrect_score: z.number().default(0),
      blank_score: z.number().default(0),
      explanation: z.string().optional().default(""),
      options: z.array(optionSchema).min(2, "Minimal 2 opsi jawaban"),
    })
  ).min(1, "Minimal 1 butir soal"),
});

export async function POST(req: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await req.json();

    const parsed = questionImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format JSON tidak valid: " + parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { exam_id, questions } = parsed.data;

    // Get highest current position
    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("position")
      .eq("exam_id", exam_id)
      .order("position", { ascending: false })
      .limit(1);

    let currentPos = (existingQuestions?.[0]?.position || 0) + 1;

    // Cache or create sections
    const sectionMap: Record<string, string> = {};
    const { data: existingSections } = await supabase
      .from("exam_sections")
      .select("id, title")
      .eq("exam_id", exam_id);

    if (existingSections) {
      for (const s of existingSections) {
        sectionMap[s.title.trim().toLowerCase()] = s.id;
      }
    }

    let insertedCount = 0;

    for (const q of questions) {
      const sectionName = (q.section_title || "Bagian Utama").trim();
      let sectionId = sectionMap[sectionName.toLowerCase()];

      if (!sectionId) {
        const { data: newSec, error: secErr } = await supabase
          .from("exam_sections")
          .insert({
            exam_id,
            title: sectionName,
            position: Object.keys(sectionMap).length + 1,
          })
          .select("id")
          .single();

        if (!secErr && newSec) {
          sectionId = newSec.id;
          sectionMap[sectionName.toLowerCase()] = sectionId;
        }
      }

      // Insert question
      const { data: newQuestion, error: qErr } = await supabase
        .from("questions")
        .insert({
          exam_id,
          section_id: sectionId || null,
          position: currentPos++,
          stem: q.stem,
          scoring_mode: q.scoring_mode,
          correct_score: q.correct_score,
          incorrect_score: q.incorrect_score,
          blank_score: q.blank_score,
          explanation: q.explanation || "",
        })
        .select("id")
        .single();

      if (qErr || !newQuestion) {
        continue;
      }

      // Insert options
      const optionsToInsert = q.options.map((opt, oIdx) => ({
        question_id: newQuestion.id,
        label: opt.label || String.fromCharCode(65 + oIdx),
        content: opt.content,
        position: oIdx + 1,
        is_correct: q.scoring_mode === "correctness" ? Boolean(opt.is_correct) : false,
        score_value: q.scoring_mode === "option_value" ? Number(opt.score_value ?? 0) : null,
      }));

      await supabase.from("question_options").insert(optionsToInsert);
      insertedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${insertedCount} butir soal ke dalam ujian!`,
      count: insertedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal mengimpor soal." }, { status: 500 });
  }
}
