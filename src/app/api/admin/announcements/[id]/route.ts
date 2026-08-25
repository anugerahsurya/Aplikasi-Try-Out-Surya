import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Gagal menghapus pengumuman." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil dihapus.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memproses penghapusan pengumuman." },
      { status: 500 }
    );
  }
}
