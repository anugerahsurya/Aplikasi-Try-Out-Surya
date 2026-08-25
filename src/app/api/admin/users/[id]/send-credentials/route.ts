import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail, isSmtpConfigured } from "@/lib/email/email-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const adminClient = createAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });
    }

    // Generate password reset link via Supabase Auth Admin
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    const resetUrl = linkData.properties.action_link;

    if (!isSmtpConfigured()) {
      return NextResponse.json({
        success: true,
        smtp_configured: false,
        reset_link: resetUrl,
        message: "SMTP belum dikonfigurasi. Anda dapat menyalin tautan reset secara manual.",
      });
    }

    const emailResult = await sendPasswordResetEmail({
      to: profile.email,
      fullName: profile.full_name,
      resetUrl,
    });

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        smtp_configured: true,
        reset_link: resetUrl,
        error: emailResult.error || "Gagal mengirim email",
      });
    }

    return NextResponse.json({
      success: true,
      smtp_configured: true,
      message: `Email instruksi reset password berhasil dikirim ke ${profile.email}`,
    });
  } catch (err: any) {
    console.error("Send credentials error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
