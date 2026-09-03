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

    const isViolationType = [
      "tab_hidden",
      "window_blur",
      "fullscreen_exit",
      "clipboard_attempt",
      "print_screen_attempt",
      "screenshot_attempt",
      "dev_tools_attempt",
    ].includes(eventType);

    // Check count before RPC
    const { data: attemptBefore } = await supabase
      .from("attempts")
      .select("violation_count, status")
      .eq("id", attemptId)
      .maybeSingle();

    // Call log_attempt_event RPC
    const { error } = await supabase.rpc("log_attempt_event", {
      p_attempt_id: attemptId,
      p_event_type: eventType,
      p_metadata: metadata,
    });

    if (error) {
      console.error("RPC log_attempt_event notice:", error.message || error);
      // Fallback direct insert to attempt_events if RPC fails
      await supabase.from("attempt_events").insert({
        attempt_id: attemptId,
        event_type: eventType,
        metadata: metadata,
      });
    }

    // Fetch updated violation count
    let { data: attempt } = await supabase
      .from("attempts")
      .select("violation_count, status")
      .eq("id", attemptId)
      .maybeSingle();

    // Fallback increment if old database RPC did not increment violation_count for screenshot/devtools
    if (
      isViolationType &&
      attempt &&
      attemptBefore &&
      attempt.violation_count <= attemptBefore.violation_count
    ) {
      const newCount = (attemptBefore.violation_count || 0) + 1;
      await supabase
        .from("attempts")
        .update({ violation_count: newCount })
        .eq("id", attemptId);
      attempt.violation_count = newCount;
    }

    return NextResponse.json({
      success: true,
      violation_count: attempt?.violation_count ?? ((attemptBefore?.violation_count || 0) + (isViolationType ? 1 : 0)),
      status: attempt?.status ?? "in_progress",
    });

  } catch (err: any) {
    console.error("Error in events API:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
