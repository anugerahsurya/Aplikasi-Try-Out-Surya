import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSmtpConfig, testSmtpConnection, isSmtpConfigured } from "@/lib/email/email-service";

export async function GET() {
  try {
    await requireAdmin();
    const config = getSmtpConfig();
    const configured = isSmtpConfigured();

    if (!configured || !config) {
      return NextResponse.json({
        configured: false,
        host: config?.host || "smtp.gmail.com",
        port: config?.port || 465,
        user: config?.user || "",
        from: config?.from || "",
        connected: false,
        message: "SMTP belum dikonfigurasi lengkap (masukkan SMTP_USER di file .env.local).",
      });
    }

    const testResult = await testSmtpConnection();

    return NextResponse.json({
      configured: true,
      host: config.host,
      port: config.port,
      user: config.user,
      from: config.from,
      connected: testResult.success,
      message: testResult.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
