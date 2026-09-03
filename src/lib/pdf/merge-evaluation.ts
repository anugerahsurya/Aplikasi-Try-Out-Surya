import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AiEvaluationReport, ParticipantExamPerformance } from "../ai/evaluation-service";

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const paragraphs = text.split("\n");
  const resultLines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      resultLines.push("");
      continue;
    }

    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

/**
 * Merge the master explanation PDF with a personalized diagnostic page for the participant.
 */
export async function mergeEvaluationWithMasterPdf({
  masterPdfBytes,
  evaluation,
  performance,
}: {
  masterPdfBytes: Uint8Array;
  evaluation: AiEvaluationReport;
  performance: ParticipantExamPerformance;
}): Promise<Uint8Array> {
  const masterDoc = await PDFDocument.load(masterPdfBytes);
  const fontRegular = await masterDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await masterDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 45;
  const MARGIN_RIGHT = 45;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  // Add the final evaluation page
  const evalPage = masterDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - 45;

  // Top Header
  evalPage.drawText("LEMBAR DIAGNOSTIK & EVALUASI PERSONAL PESERTA", {
    x: MARGIN_LEFT,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.04, 0.12, 0.23),
  });

  const badgeText =
    evaluation.generatedBy === "gemini-3.5-flash-lite" || evaluation.generatedBy === "gemini-flash-lite"
      ? "Dianalisis oleh AI Gemini 3.5 Flash-Lite"
      : "Dianalisis oleh Sistem Evaluator NavyTryout";
  const badgeWidth = fontRegular.widthOfTextAtSize(badgeText, 7.5);
  evalPage.drawText(badgeText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - badgeWidth,
    y: currentY,
    size: 7.5,
    font: fontOblique,
    color: rgb(0.3, 0.5, 0.7),
  });

  currentY -= 6;
  evalPage.drawLine({
    start: { x: MARGIN_LEFT, y: currentY },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: currentY },
    thickness: 0.8,
    color: rgb(0.85, 0.88, 0.92),
  });

  currentY -= 20;

  // 1. Participant Identity & Score Card Banner
  const cardHeight = 75;
  evalPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - cardHeight,
    width: CONTENT_WIDTH,
    height: cardHeight,
    color: rgb(0.04, 0.12, 0.23), // Deep Navy
  });

  evalPage.drawText("HASIL SIMULASI RESMI", {
    x: MARGIN_LEFT + 16,
    y: currentY - 20,
    size: 8,
    font: fontBold,
    color: rgb(0.56, 0.74, 0.91),
  });

  evalPage.drawText(performance.studentName, {
    x: MARGIN_LEFT + 16,
    y: currentY - 38,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  evalPage.drawText(`Email: ${performance.email}   |   Ujian: ${performance.examTitle}`, {
    x: MARGIN_LEFT + 16,
    y: currentY - 56,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.8, 0.88, 0.95),
  });

  // Score Highlight Box on Right of Card
  const scoreBoxWidth = 100;
  evalPage.drawRectangle({
    x: PAGE_WIDTH - MARGIN_RIGHT - scoreBoxWidth - 14,
    y: currentY - cardHeight + 10,
    width: scoreBoxWidth,
    height: cardHeight - 20,
    color: rgb(0.1, 0.22, 0.38),
    borderColor: rgb(0.2, 0.4, 0.65),
    borderWidth: 1,
  });

  evalPage.drawText("TOTAL SKOR", {
    x: PAGE_WIDTH - MARGIN_RIGHT - scoreBoxWidth + 4,
    y: currentY - 24,
    size: 7.5,
    font: fontBold,
    color: rgb(0.7, 0.85, 1),
  });

  const scoreStr = `${performance.totalScore}`;
  evalPage.drawText(scoreStr, {
    x: PAGE_WIDTH - MARGIN_RIGHT - scoreBoxWidth + 4,
    y: currentY - 50,
    size: 22,
    font: fontBold,
    color: rgb(1, 0.84, 0.2), // Gold
  });

  currentY -= cardHeight + 16;

  // 2. Metrics Row (Benar / Salah / Kosong / Akurasi)
  const metricsHeight = 36;
  evalPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - metricsHeight,
    width: CONTENT_WIDTH,
    height: metricsHeight,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.85, 0.9, 0.96),
    borderWidth: 0.75,
  });

  const accuracyPct = Math.round((performance.correctCount / Math.max(1, performance.totalQuestions)) * 100);
  const metricsStr = `Benar: ${performance.correctCount} Soal   |   Salah: ${performance.incorrectCount} Soal   |   Kosong: ${performance.blankCount} Soal   |   Tingkat Akurasi: ${accuracyPct}%`;
  evalPage.drawText(metricsStr, {
    x: MARGIN_LEFT + 14,
    y: currentY - 22,
    size: 8.5,
    font: fontBold,
    color: rgb(0.08, 0.18, 0.32),
  });

  currentY -= metricsHeight + 18;

  // 3. Section Breakdown Table
  if (performance.sectionBreakdown && performance.sectionBreakdown.length > 0) {
    evalPage.drawText("RINCIAN PEROLEHAN SKOR PER BAGIAN", {
      x: MARGIN_LEFT,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.04, 0.12, 0.23),
    });
    currentY -= 12;

    for (const sec of performance.sectionBreakdown) {
      evalPage.drawRectangle({
        x: MARGIN_LEFT,
        y: currentY - 18,
        width: CONTENT_WIDTH,
        height: 18,
        color: rgb(0.97, 0.98, 0.99),
      });

      evalPage.drawText(`• ${sec.sectionTitle}`, {
        x: MARGIN_LEFT + 8,
        y: currentY - 13,
        size: 8,
        font: fontBold,
        color: rgb(0.15, 0.2, 0.3),
      });

      const secScoreStr = `Skor: ${sec.earnedScore} poin  (${sec.correctCount}/${sec.questionCount} benar)`;
      const secScoreWidth = fontRegular.widthOfTextAtSize(secScoreStr, 8);
      evalPage.drawText(secScoreStr, {
        x: PAGE_WIDTH - MARGIN_RIGHT - secScoreWidth - 8,
        y: currentY - 13,
        size: 8,
        font: fontRegular,
        color: rgb(0.25, 0.35, 0.45),
      });

      currentY -= 22;
    }
    currentY -= 8;
  }

  // 4. AI Diagnostic Summary Box
  evalPage.drawText("RINGKASAN DIAGNOSTIK & EVALUASI", {
    x: MARGIN_LEFT,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.04, 0.12, 0.23),
  });
  currentY -= 14;

  const summaryLines = wrapText(evaluation.summary, fontRegular, 8.5, CONTENT_WIDTH - 24);
  const summaryBoxHeight = summaryLines.length * 12 + 16;

  evalPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - summaryBoxHeight,
    width: CONTENT_WIDTH,
    height: summaryBoxHeight,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.85, 0.9, 0.96),
    borderWidth: 0.75,
  });

  let sumY = currentY - 12;
  for (const sLine of summaryLines) {
    evalPage.drawText(sLine, {
      x: MARGIN_LEFT + 12,
      y: sumY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.15, 0.22, 0.3),
    });
    sumY -= 12;
  }
  currentY -= summaryBoxHeight + 18;

  // 5. Areas to Improve (Aspek yang Perlu Ditingkatkan)
  evalPage.drawText("ASPEK YANG PERLU DITINGKATKAN (PRIORITAS PERBAIKAN)", {
    x: MARGIN_LEFT,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.75, 0.15, 0.15), // Deep Red
  });
  currentY -= 14;

  for (const area of evaluation.areasToImprove) {
    const areaLines = wrapText(`▲ ${area}`, fontRegular, 8.5, CONTENT_WIDTH - 20);
    for (let l = 0; l < areaLines.length; l++) {
      evalPage.drawText(areaLines[l], {
        x: MARGIN_LEFT + (l === 0 ? 6 : 18),
        y: currentY,
        size: 8.5,
        font: l === 0 ? fontBold : fontRegular,
        color: rgb(0.45, 0.1, 0.1),
      });
      currentY -= 12;
    }
    currentY -= 3;
  }
  currentY -= 10;

  // 6. Actionable Recommendations
  evalPage.drawText("REKOMENDASI & RENCANA TINDAK LANJUT BELAJAR", {
    x: MARGIN_LEFT,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.06, 0.45, 0.22), // Forest Green
  });
  currentY -= 14;

  for (let r = 0; r < evaluation.actionableRecommendations.length; r++) {
    const recText = `${r + 1}. ${evaluation.actionableRecommendations[r]}`;
    const recLines = wrapText(recText, fontRegular, 8.5, CONTENT_WIDTH - 20);
    for (let l = 0; l < recLines.length; l++) {
      evalPage.drawText(recLines[l], {
        x: MARGIN_LEFT + (l === 0 ? 6 : 18),
        y: currentY,
        size: 8.5,
        font: l === 0 ? fontBold : fontRegular,
        color: rgb(0.1, 0.35, 0.18),
      });
      currentY -= 12;
    }
    currentY -= 3;
  }

  // Footer on final evaluation page
  evalPage.drawLine({
    start: { x: MARGIN_LEFT, y: 36 },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 36 },
    thickness: 0.75,
    color: rgb(0.85, 0.88, 0.92),
  });

  evalPage.drawText("Dokumen Evaluasi Otomatis NavyTryout — Dihasilkan khusus untuk peserta yang bersangkutan.", {
    x: MARGIN_LEFT,
    y: 24,
    size: 7.5,
    font: fontOblique,
    color: rgb(0.45, 0.5, 0.58),
  });

  const totalPages = masterDoc.getPageCount();
  const pageStr = `Halaman Terakhir (${totalPages} dari ${totalPages})`;
  const pageStrWidth = fontBold.widthOfTextAtSize(pageStr, 8);
  evalPage.drawText(pageStr, {
    x: PAGE_WIDTH - MARGIN_RIGHT - pageStrWidth,
    y: 24,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  return await masterDoc.save();
}
