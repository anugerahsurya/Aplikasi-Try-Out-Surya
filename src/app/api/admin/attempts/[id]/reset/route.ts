import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 1. Verify admin authorization
    await requireAdmin();

    // 2. Use admin client (service role) to bypass RLS
    const adminSupabase = createAdminClient();

    // 3. Fetch attempt details to get user_id and exam_id
    const { data: attempt, error: fetchError } = await adminSupabase
      .from("attempts")
      .select("id, user_id, exam_id, exam:exams(title), profile:profiles(full_name, email)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching attempt for reset:", fetchError);
      return NextResponse.json(
        { error: fetchError.message || "Gagal mengambil data sesi ujian." },
        { status: 500 }
      );
    }

    if (!attempt) {
      return NextResponse.json(
        { error: "Sesi ujian tidak ditemukan atau sudah pernah di-reset sebelumnya." },
        { status: 404 }
      );
    }

    // 4. Delete related rows (child tables first to guarantee no foreign key blockers, then attempt itself)
    await Promise.all([
      adminSupabase.from("attempt_answers").delete().eq("attempt_id", id),
      adminSupabase.from("attempt_events").delete().eq("attempt_id", id),
      adminSupabase.from("attempt_question_snapshots").delete().eq("attempt_id", id),
    ]);

    const { error: deleteError } = await adminSupabase
      .from("attempts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting attempt:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Gagal menghapus sesi ujian dari database." },
        { status: 500 }
      );
    }

    // 5. Ensure assignment is active
    if (attempt.exam_id && attempt.user_id) {
      await adminSupabase
        .from("exam_assignments")
        .update({ status: "active" })
        .eq("exam_id", attempt.exam_id)
        .eq("user_id", attempt.user_id);
    }

    // 6. Invalidate Next.js cache across admin and participant paths
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/attempts");
    revalidatePath(`/admin/attempts/${id}`);
    revalidatePath("/admin/exams");
    if (attempt.exam_id) {
      revalidatePath(`/admin/exams/${attempt.exam_id}`);
      revalidatePath(`/admin/exams/${attempt.exam_id}/leaderboard`);
      revalidatePath(`/leaderboard/${attempt.exam_id}`);
    }
    revalidatePath("/dashboard");
    revalidatePath("/exams");
    revalidatePath("/results");

    const studentName = (attempt.profile as any)?.full_name || "Peserta";
    const examTitle = (attempt.exam as any)?.title || "Ujian";

    return NextResponse.json({
      success: true,
      message: `Sesi ujian "${examTitle}" untuk ${studentName} berhasil di-reset. Peserta dapat langsung mengulang ujian dari awal.`,
    });
  } catch (err: any) {
    console.error("Catch error in reset route:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal memproses reset ujian." },
      { status: 500 }
    );
  }
}
