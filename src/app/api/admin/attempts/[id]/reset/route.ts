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
    const { supabase: userSupabase } = await requireAdmin();

    // 2. Try RPC admin_reset_attempt first (SECURITY DEFINER, always works without service_role key)
    const { data: rpcData, error: rpcError } = await userSupabase.rpc("admin_reset_attempt", {
      p_attempt_id: id,
    });

    if (!rpcError && rpcData) {
      // Invalidate Next.js cache across admin and participant paths
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/attempts");
      revalidatePath(`/admin/attempts/${id}`);
      revalidatePath("/admin/exams");
      revalidatePath("/dashboard");
      revalidatePath("/exams");
      revalidatePath("/results");

      return NextResponse.json({
        success: true,
        message: `Sesi ujian "${rpcData.exam_title || "Ujian"}" untuk ${rpcData.student_name || "Peserta"} berhasil di-reset.`,
      });
    }

    // 3. Fallback to direct client delete if RPC is not present
    const adminSupabase = createAdminClient();
    const activeClient = process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
      ? adminSupabase
      : userSupabase;

    // Fetch attempt details
    const { data: attempt, error: fetchError } = await activeClient
      .from("attempts")
      .select("id, user_id, exam_id, exam:exams(title), profile:profiles(full_name, email)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError && fetchError.message !== "Invalid API key") {
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

    // Delete related child rows
    await Promise.all([
      activeClient.from("attempt_answers").delete().eq("attempt_id", id),
      activeClient.from("attempt_events").delete().eq("attempt_id", id),
      activeClient.from("attempt_question_snapshots").delete().eq("attempt_id", id),
    ]);

    const { error: deleteError } = await activeClient
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

    // Ensure assignment is active
    if (attempt.exam_id && attempt.user_id) {
      await activeClient
        .from("exam_assignments")
        .update({ status: "active" })
        .eq("exam_id", attempt.exam_id)
        .eq("user_id", attempt.user_id);
    }

    // Invalidate Next.js cache across admin and participant paths
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
