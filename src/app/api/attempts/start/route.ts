import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = await req.json();
    const examId = body.exam_id;

    if (!examId) {
      return NextResponse.json({ error: "Exam ID diperlukan" }, { status: 400 });
    }

    // Ensure assignment exists
    await supabase
      .from("exam_assignments")
      .upsert(
        {
          exam_id: examId,
          user_id: user.id,
          attempt_limit: 1,
          status: "active",
        },
        { onConflict: "exam_id,user_id" }
      );

    // Call start_or_resume_attempt RPC (SECURITY DEFINER)
    const { data: attemptId, error } = await supabase.rpc("start_or_resume_attempt", {
      p_exam_id: examId,
    });

    if (error) {
      console.error("Start attempt RPC error:", error);
      return NextResponse.json({ error: error.message || "Gagal memulai sesi ujian" }, { status: 400 });
    }

    return NextResponse.json({ success: true, attempt_id: attemptId });
  } catch (err: any) {
    console.error("Start exam API error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
