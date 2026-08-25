import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: announcements, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      // Return empty array if table doesn't exist yet
      return NextResponse.json({ announcements: [] });
    }

    return NextResponse.json({ announcements: announcements || [] });
  } catch (err: any) {
    return NextResponse.json({ announcements: [] });
  }
}
