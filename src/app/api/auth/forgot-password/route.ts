import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail, isSmtpConfigured } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if user exists
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      // Don't disclose user existence for security
      return NextResponse.json({
        success: true,
        message: "Jika email terdaftar, instruksi reset password telah dikirim.",
      });
    }

    // Generate reset password link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (linkError) {
      console.error("Generate reset link error:", linkError);
      return NextResponse.json({ error: "Gagal membuat tautan reset" }, { status: 400 });
    }

    const resetUrl = linkData.properties.action_link;

    if (isSmtpConfigured()) {
      await sendPasswordResetEmail({
        to: email,
        fullName: profile.full_name,
        resetUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Instruksi reset password telah dikirim ke email Anda.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
