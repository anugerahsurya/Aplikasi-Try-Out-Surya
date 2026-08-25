import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

    // Call submit_attempt RPC
    const { data: finalScore, error } = await supabase.rpc("submit_attempt", {
      p_attempt_id: attemptId,
    });

    if (error) {
      console.error("RPC submit_attempt error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      score: finalScore,
      redirect_url: `/results/${attemptId}`,
    });
  } catch (err: any) {
    console.error("Error in submit API:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
