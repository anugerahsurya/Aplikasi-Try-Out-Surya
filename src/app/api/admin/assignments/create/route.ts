import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const body = await request.json();
    const { user_id, exam_id, attempt_limit = 1, extra_time_minutes = 0 } = body;

    if (!user_id || !exam_id) {
      return NextResponse.json({ error: "User ID dan Exam ID diperlukan" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam_assignments")
      .upsert(
        {
          user_id,
          exam_id,
          attempt_limit,
          extra_time_minutes,
          status: "active",
        },
        { onConflict: "exam_id,user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Assignment error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, assignment: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
