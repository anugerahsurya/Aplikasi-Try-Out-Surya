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

    const body = await request.json();
    const eventType = body.event_type;
    const metadata = body.metadata || {};

    if (!eventType) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    // Call log_attempt_event RPC
    const { error } = await supabase.rpc("log_attempt_event", {
      p_attempt_id: attemptId,
      p_event_type: eventType,
      p_metadata: metadata,
    });

    if (error) {
      console.error("RPC log_attempt_event error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch updated violation count
    const { data: attempt } = await supabase
      .from("attempts")
      .select("violation_count, status")
      .eq("id", attemptId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      violation_count: attempt?.violation_count ?? 0,
      status: attempt?.status ?? "in_progress",
    });

  } catch (err: any) {
    console.error("Error in events API:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
