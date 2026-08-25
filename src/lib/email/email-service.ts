import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASSWORD || "ciwh afam oyfq ahpk";
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.SMTP_FROM || (user ? `NavyTryout <${user}>` : "NavyTryout <noreply@tryout.app>");

  // If user or password is completely empty, it's not configured
  if (!user && !process.env.SMTP_USER) {
    // Check if we have pass and can deduce host
    if (!pass) return null;
  }

  return { host, port, secure, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  const config = getSmtpConfig();
  return Boolean(config && config.host && config.pass && (config.user || process.env.SMTP_USER));
}

export function createTransporter() {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("SMTP configuration is incomplete");
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = getSmtpConfig();
    if (!config || !config.user) {
      return {
        success: false,
        message: "SMTP_USER belum diatur di .env.local atau environment variables.",
      };
    }
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: "Koneksi SMTP berhasil terhubung." };
  } catch (error: any) {
    return {
      success: false,
      message: `Gagal menghubungkan ke SMTP: ${error?.message || "Unknown error"}`,
    };
  }
}

export async function sendCredentialsEmail({
  to,
  fullName,
  email,
  temporaryPassword,
  loginUrl,
}: {
  to: string;
  fullName: string;
  email: string;
  temporaryPassword?: string;
  loginUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = getSmtpConfig();
    if (!config || !config.user) {
      return { success: false, error: "SMTP belum dikonfigurasi lengkap (SMTP_USER belum diisi)." };
    }

    const transporter = createTransporter();
    const targetLoginUrl = loginUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kredensial Akun NavyTryout</title>
  <style>
    body { margin: 0; padding: 0; background-color: #07162c; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #10213a; }
    .wrapper { width: 100%; max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
    .header { background-color: #0b1f3a; padding: 32px 28px; text-align: center; }
    .logo { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .logo span { color: #8fbce8; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0b1f3a; margin-top: 0; }
    .text { font-size: 15px; line-height: 1.6; color: #475467; margin-bottom: 20px; }
    .creds-box { background-color: #f4f7fb; border: 1px solid #dbe4ef; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .cred-row { margin-bottom: 10px; font-size: 14px; }
    .cred-row:last-child { margin-bottom: 0; }
    .cred-label { color: #6d7a8d; font-weight: 600; }
    .cred-value { font-family: monospace; font-size: 16px; font-weight: 700; color: #0b1f3a; margin-left: 8px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #0b1f3a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; }
    .footer { padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #eaecf0; text-align: center; font-size: 12px; color: #98a2b3; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="logo">Navy<span>Tryout</span></h1>
    </div>
    <div class="content">
      <h2 class="greeting">Halo, ${fullName || "Peserta"}!</h2>
      <p class="text">Akun Anda untuk mengikuti ujian di platform <strong>NavyTryout</strong> telah berhasil dibuat oleh administrator. Berikut adalah rincian kredensial akun Anda:</p>
      
      <div class="creds-box">
        <div class="cred-row">
          <span class="cred-label">Email:</span>
          <span class="cred-value">${email}</span>
        </div>
        ${
          temporaryPassword
            ? `<div class="cred-row">
          <span class="cred-label">Password Sementara:</span>
          <span class="cred-value">${temporaryPassword}</span>
        </div>`
            : ""
        }
      </div>

      <p class="text">Disarankan untuk segera masuk dan mengubah password Anda pada halaman profil setelah login pertama.</p>

      <div class="btn-container">
        <a href="${targetLoginUrl}" class="btn">Masuk ke NavyTryout →</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">Email ini dibuat secara otomatis oleh sistem NavyTryout. Jangan membalas email ini.</p>
    </div>
  </div>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: `Kredensial Akun NavyTryout Anda`,
      text: `Halo ${fullName || "Peserta"},\n\nAkun NavyTryout Anda telah dibuat.\nEmail: ${email}\n${
        temporaryPassword ? `Password Sementara: ${temporaryPassword}\n` : ""
      }\nSilakan login di: ${targetLoginUrl}`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send credentials email:", error);
    return { success: false, error: error?.message || "Gagal mengirim email." };
  }
}

export async function sendPasswordResetEmail({
  to,
  fullName,
  resetUrl,
}: {
  to: string;
  fullName: string;
  resetUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getSmtpConfig();
    if (!config || !config.user) {
      return { success: false, error: "SMTP belum dikonfigurasi lengkap." };
    }

    const transporter = createTransporter();

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Reset Password NavyTryout</title>
  <style>
    body { margin: 0; padding: 0; background-color: #07162c; font-family: Arial, sans-serif; color: #10213a; }
    .wrapper { max-width: 540px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; }
    .header { background-color: #0b1f3a; padding: 28px; text-align: center; color: white; }
    .content { padding: 32px 28px; }
    .btn { display: inline-block; background-color: #0b1f3a; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h2 style="margin:0;">Navy<span>Tryout</span></h2>
    </div>
    <div class="content">
      <h3>Permintaan Reset Password</h3>
      <p>Halo ${fullName || "Pengguna"}, kami menerima permintaan untuk mengatur ulang password akun Anda.</p>
      <p>Klik tombol di bawah ini untuk membuat password baru:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" class="btn">Reset Password Sekarang</a>
      </div>
      <p style="font-size: 13px; color: #6d7a8d;">Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
    </div>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
      from: config.from,
      to,
      subject: `Reset Password Akun NavyTryout`,
      text: `Halo ${fullName},\n\nKlik tautan berikut untuk mereset password Anda: ${resetUrl}`,
      html: htmlContent,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send reset email:", error);
    return { success: false, error: error?.message || "Gagal mengirim email reset password." };
  }
}
