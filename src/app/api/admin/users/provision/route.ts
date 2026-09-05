import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCredentialsEmail, isSmtpConfigured } from "@/lib/email/email-service";
import crypto from "crypto";

function generateSecurePassword(length = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let pwd = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pwd += chars[randomBytes[i] % chars.length];
  }
  return pwd;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { email, full_name, phone, institution, role = "participant", send_email = true } = body;

    if (!email || !full_name) {
      return NextResponse.json(
        { error: "Email dan nama lengkap wajib diisi." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const tempPassword = generateSecurePassword(10);

    // Create user in Supabase Auth via Admin client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // Update profile table
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId,
      email,
      full_name,
      phone: phone || null,
      institution: institution || null,
      role: role || "participant",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
    }

    let emailResult = { sent: false, error: "Opsi kirim email tidak dicentang." };
    if (send_email) {
      if (isSmtpConfigured()) {
        const emailResp = await sendCredentialsEmail({
          to: email,
          fullName: full_name,
          email,
          temporaryPassword: tempPassword,
        });
        emailResult = {
          sent: emailResp.success,
          error: emailResp.error || "",
        };
      } else {
        emailResult = {
          sent: false,
          error:
            "SMTP belum dikonfigurasi di server. Pastikan SMTP_USER dan SMTP_PASSWORD sudah diatur pada .env.local (lokal) atau Environment Variables (Vercel).",
        };
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        email,
        full_name,
        role,
        temporary_password: tempPassword,
      },
      email_status: emailResult,
    });
  } catch (err: any) {
    console.error("Provisioning error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
