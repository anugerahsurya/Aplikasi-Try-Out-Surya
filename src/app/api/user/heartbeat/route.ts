import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("last_sign_in_at")
      .eq("id", user.id)
      .maybeSingle();

    const lastSeen = profile?.last_sign_in_at ? new Date(profile.last_sign_in_at).getTime() : 0;
    const now = Date.now();

    // Throttle: only update DB if last update was over 2 minutes ago
    if (now - lastSeen > 2 * 60 * 1000) {
      await supabase
        .from("profiles")
        .update({ last_sign_in_at: new Date(now).toISOString() })
        .eq("id", user.id);
    }

    return NextResponse.json({ success: true, timestamp: now });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
