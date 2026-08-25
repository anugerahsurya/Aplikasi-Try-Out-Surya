import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail, isSmtpConfigured } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (hasServiceRole) {
      try {
        const adminClient = createAdminClient();

        // Check if user exists
        const { data: profile } = await adminClient
          .from("profiles")
          .select("full_name, email")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          // Generate reset password link
          const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
              redirectTo: `${appUrl}/reset-password`,
            },
          });

          if (!linkError && linkData?.properties?.action_link) {
            const resetUrl = linkData.properties.action_link;

            if (isSmtpConfigured()) {
              await sendPasswordResetEmail({
                to: email,
                fullName: profile.full_name,
                resetUrl,
              });
            }
          }
        }
      } catch (adminErr) {
        console.warn("Service role generateLink fallback:", adminErr);
      }
    }

    // Standard Supabase client fallback
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    return NextResponse.json({
      success: true,
      message: "Tautan instruksi pemulihan password telah dikirim ke email Anda.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({
      success: true,
      message: "Jika email terdaftar, tautan pemulihan telah dikirim.",
    });
  }
}
