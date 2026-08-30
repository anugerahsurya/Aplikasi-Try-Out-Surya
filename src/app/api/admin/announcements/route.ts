import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();
    const body = await req.json();

    const { title, message, type = "announcement", target_role = "all" } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Judul dan isi pesan pengumuman wajib diisi." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: newAnnouncement, error } = await adminSupabase
      .from("announcements")
      .insert({
        title,
        message,
        type,
        target_role,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Gagal membuat pengumuman." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil disiarkan ke seluruh peserta.",
      announcement: newAnnouncement,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memproses pengumuman." },
      { status: 500 }
    );
  }
}
