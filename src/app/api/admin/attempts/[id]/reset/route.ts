import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdmin();

    // 1. Fetch attempt details to get user_id and exam_id
    const { data: attempt, error: fetchError } = await supabase
      .from("attempts")
      .select("id, user_id, exam_id, exam:exams(title), profile:profiles(full_name, email)")
      .eq("id", id)
      .single();

    if (fetchError || !attempt) {
      return NextResponse.json(
        { error: "Sesi ujian tidak ditemukan." },
        { status: 404 }
      );
    }

    // 2. Delete attempt (cascades to snapshots, answers, events)
    const { error: deleteError } = await supabase
      .from("attempts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Gagal mereset sesi ujian." },
        { status: 500 }
      );
    }

    // 3. Ensure assignment is active
    await supabase
      .from("exam_assignments")
      .update({ status: "active" })
      .eq("exam_id", attempt.exam_id)
      .eq("user_id", attempt.user_id);

    const studentName = (attempt.profile as any)?.full_name || "Peserta";
    const examTitle = (attempt.exam as any)?.title || "Ujian";

    return NextResponse.json({
      success: true,
      message: `Sesi ujian "${examTitle}" untuk ${studentName} berhasil di-reset. Peserta dapat memulai ulang ujian dari awal.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memproses reset ujian." },
      { status: 500 }
    );
  }
}
