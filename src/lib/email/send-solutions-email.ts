import { createTransporter, getSmtpConfig } from "./email-service";

export interface SendSolutionEmailParams {
  to: string;
  studentName: string;
  examTitle: string;
  examPackage: string;
  score: number;
  completedAt?: string;
  summaryText?: string;
  pdfAttachmentBuffer: Buffer;
  pdfFilename?: string;
}

export async function sendSolutionEmail({
  to,
  studentName,
  examTitle,
  examPackage,
  score,
  completedAt,
  summaryText,
  pdfAttachmentBuffer,
  pdfFilename,
}: SendSolutionEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = getSmtpConfig();
    if (!config || !config.user) {
      return { success: false, error: "SMTP belum dikonfigurasi lengkap di server." };
    }

    const transporter = createTransporter();
    const formattedDate = completedAt
      ? new Date(completedAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    const safeFilename = pdfFilename || `Pembahasan_${examPackage || "Ujian"}_${studentName.replace(/\s+/g, "_")}.pdf`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pembahasan & Evaluasi Ujian — NavyTryout</title>
  <style>
    body { margin: 0; padding: 0; background-color: #07162c; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #10213a; }
    .wrapper { width: 100%; max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
    .header { background-color: #0b1f3a; padding: 32px 28px; text-align: center; }
    .logo { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .logo span { color: #8fbce8; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 19px; font-weight: 800; color: #0b1f3a; margin-top: 0; }
    .text { font-size: 15px; line-height: 1.6; color: #475467; margin-bottom: 20px; }
    .exam-attr-box { background-color: #f4f7fb; border: 1px solid #dbe4ef; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .attr-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
    .attr-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
    .attr-label { color: #6d7a8d; font-weight: 600; }
    .attr-val { font-weight: 700; color: #0b1f3a; }
    .score-badge { font-size: 20px; color: #d97706; font-weight: 800; }
    .eval-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.5; color: #065f46; }
    .attach-notice { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center; }
    .footer { padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #eaecf0; text-align: center; font-size: 12px; color: #98a2b3; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="logo">Navy<span>Tryout</span></h1>
      <p style="color: #8fbce8; margin: 6px 0 0; font-size: 13px; font-weight: 600;">DOKUMEN PEMBAHASAN RESMI & EVALUASI</p>
    </div>
    <div class="content">
      <h2 class="greeting">Halo, ${studentName}! 🎓</h2>
      <p class="text">
        Selamat atas partisipasi Anda dalam simulasi ujian <strong>${examTitle}</strong>. Kami telah menyusun dokumen kunci jawaban, pembahasan menyeluruh, serta evaluasi diagnostik personal untuk membantu persiapan Anda.
      </p>

      <div class="exam-attr-box">
        <div class="attr-row">
          <span class="attr-label">Judul Ujian:</span>
          <span class="attr-val">${examTitle}</span>
        </div>
        <div class="attr-row">
          <span class="attr-label">Paket / Kategori:</span>
          <span class="attr-val">${examPackage}</span>
        </div>
        <div class="attr-row">
          <span class="attr-label">Waktu Selesai:</span>
          <span class="attr-val">${formattedDate}</span>
        </div>
        <div class="attr-row">
          <span class="attr-label">Total Skor Perolehan:</span>
          <span class="attr-val score-badge">${score} Poin</span>
        </div>
      </div>

      ${
        summaryText
          ? `<div class="eval-box">
               <strong style="display: block; margin-bottom: 6px; font-size: 14px;">💡 Catatan Evaluasi & Diagnostik AI:</strong>
               ${summaryText}
             </div>`
          : ""
      }

      <div class="attach-notice">
        <p style="margin: 0; font-weight: 700; color: #1e40af; font-size: 14px;">
          📎 Berkas Terlampir: <span>${safeFilename}</span>
        </p>
        <p style="margin: 6px 0 0; font-size: 12.5px; color: #3b82f6;">
          Silakan buka dan unduh dokumen PDF terlampir di email ini untuk melihat pembahasan lengkap seluruh butir soal serta lembar evaluasi aspek materi yang perlu ditingkatkan.
        </p>
      </div>

      <p class="text" style="font-size: 13.5px; color: #64748b;">
        Teruslah berlatih secara konsisten untuk memaksimalkan peluang kelulusan Anda di ujian yang sebenarnya. Sukses selalu!
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px;"><strong>NavyTryout Platform</strong> — Portal Simulasi Ujian & Tes Kedinasan</p>
      <p style="margin: 0;">Email ini dikirimkan otomatis oleh sistem. Mohon tidak membalas langsung ke alamat ini.</p>
    </div>
  </div>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: `[Pembahasan Resmi] ${examTitle} — Hasil & Evaluasi Anda`,
      text: `Halo ${studentName},\n\nTerima kasih telah mengikuti simulasi ujian "${examTitle}".\nTotal Skor Anda: ${score}\n\nDokumen PDF pembahasan lengkap beserta lembar evaluasi personal AI telah kami lampirkan pada email ini.\n\nSalam sukses,\nNavyTryout`,
      html: htmlContent,
      attachments: [
        {
          filename: safeFilename,
          content: pdfAttachmentBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("sendSolutionEmail error:", err);
    return { success: false, error: err?.message || "Gagal mengirimkan email pembahasan." };
  }
}
