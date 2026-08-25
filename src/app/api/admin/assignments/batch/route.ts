import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await req.json();
    const { exam_id, user_ids, attempt_limit = 1, extra_time_minutes = 0 } = body;

    if (!exam_id || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "exam_id dan minimal satu user_id diperlukan." },
        { status: 400 }
      );
    }

    const assignments = user_ids.map((userId: string) => ({
      exam_id,
      user_id: userId,
      attempt_limit: Number(attempt_limit) || 1,
      extra_time_minutes: Number(extra_time_minutes) || 0,
      status: "active",
    }));

    const { data, error } = await supabase
      .from("exam_assignments")
      .upsert(assignments, { onConflict: "exam_id,user_id" })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      message: `Berhasil menugaskan ujian ke ${data?.length || 0} peserta.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memproses penugasan massal." },
      { status: 500 }
    );
  }
}
