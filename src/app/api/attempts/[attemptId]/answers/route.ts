import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const answers = body.answers; // array of { question_id, selected_option_id, client_updated_at }

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Call save_attempt_answers RPC
    const { error } = await supabase.rpc("save_attempt_answers", {
      p_attempt_id: attemptId,
      p_answers: answers,
    });

    if (error) {
      console.error("RPC save_attempt_answers error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, saved_count: answers.length });
  } catch (err: any) {
    console.error("Error in answers API:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
