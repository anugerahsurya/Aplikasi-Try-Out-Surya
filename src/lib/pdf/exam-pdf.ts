import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ExamPdfQuestionOption {
  label: string;
  content: string;
  is_correct?: boolean;
  score_value?: number | null;
}

export interface ExamPdfQuestion {
  id: string;
  position: number;
  stem: string;
  scoring_mode: "correctness" | "option_value";
  correct_score: number;
  incorrect_score: number;
  blank_score: number;
  explanation?: string | null;
  section_title?: string | null;
  options: ExamPdfQuestionOption[];
}

export interface ExamPdfData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  duration_minutes: number;
  questions: ExamPdfQuestion[];
}

// Word wrapping utility for pdf-lib
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
 * Generate Master PDF Pembahasan Ujian (Soal + Opsi + Kunci + Pembahasan Lengkap)
 */
export async function generateMasterExamPdf(exam: ExamPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595.28; // A4 Width
  const PAGE_HEIGHT = 841.89; // A4 Height
  const MARGIN_LEFT = 45;
  const MARGIN_RIGHT = 45;
  const MARGIN_TOP = 50;
  const MARGIN_BOTTOM = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - MARGIN_TOP;

  // Helper to check if content fits on current page, else spawn new page
  const ensureSpace = (neededHeight: number) => {
    if (currentY - neededHeight < MARGIN_BOTTOM) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN_TOP;
      drawHeader();
    }
  };

  const drawHeader = () => {
    // Running Top Header
    currentPage.drawText("TRY OUT NASIONAL — KUNCI JAWABAN & PEMBAHASAN RESMI", {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 32,
      size: 8,
      font: fontBold,
      color: rgb(0.04, 0.12, 0.23),
    });

    const titleTruncated = exam.title.length > 40 ? exam.title.substring(0, 38) + "..." : exam.title;
    const titleWidth = fontRegular.widthOfTextAtSize(titleTruncated, 8);
    currentPage.drawText(titleTruncated, {
      x: PAGE_WIDTH - MARGIN_RIGHT - titleWidth,
      y: PAGE_HEIGHT - 32,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Divider rule
    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 38 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 38 },
      thickness: 0.75,
      color: rgb(0.85, 0.88, 0.92),
    });

    currentY = PAGE_HEIGHT - 55;
  };

  // -------------------------------------------------------------
  // 1. Cover / Banner Section on Page 1
  // -------------------------------------------------------------
  // Navy Header Banner Box
  const bannerHeight = 85;
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - bannerHeight,
    width: CONTENT_WIDTH,
    height: bannerHeight,
    color: rgb(0.04, 0.12, 0.23), // Deep Navy
  });

  currentPage.drawText("DOKUMEN KUNCI & PEMBAHASAN", {
    x: MARGIN_LEFT + 20,
    y: currentY - 24,
    size: 9,
    font: fontBold,
    color: rgb(0.56, 0.74, 0.91), // Light Ice Blue
  });

  const titleLines = wrapText(exam.title, fontBold, 15, CONTENT_WIDTH - 40);
  let bannerTextY = currentY - 44;
  for (const tLine of titleLines.slice(0, 2)) {
    currentPage.drawText(tLine, {
      x: MARGIN_LEFT + 20,
      y: bannerTextY,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    bannerTextY -= 18;
  }

  // Meta bar inside banner
  const metaText = `Total Soal: ${exam.questions.length} Butir   |   Durasi Ujian: ${exam.duration_minutes} Menit   |   Paket: ${exam.slug}`;
  currentPage.drawText(metaText, {
    x: MARGIN_LEFT + 20,
    y: currentY - bannerHeight + 14,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.8, 0.88, 0.95),
  });

  currentY -= bannerHeight + 20;

  // -------------------------------------------------------------
  // 2. Loop Through Questions & Explanations
  // -------------------------------------------------------------
  let currentSection = "";

  for (let i = 0; i < exam.questions.length; i++) {
    const q = exam.questions[i];

    // Check if section changed
    if (q.section_title && q.section_title !== currentSection) {
      currentSection = q.section_title;
      ensureSpace(40);
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: currentY - 24,
        width: CONTENT_WIDTH,
        height: 24,
        color: rgb(0.93, 0.96, 0.99),
      });

      currentPage.drawText(`BAGIAN: ${currentSection.toUpperCase()}`, {
        x: MARGIN_LEFT + 12,
        y: currentY - 16,
        size: 9.5,
        font: fontBold,
        color: rgb(0.04, 0.12, 0.23),
      });
      currentY -= 36;
    }

    // Question Number & Stem
    const stemLines = wrapText(q.stem || "", fontRegular, 9.5, CONTENT_WIDTH - 30);
    const stemHeight = stemLines.length * 13 + 12;

    ensureSpace(stemHeight + 30);

    // Number Badge
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - 16,
      width: 24,
      height: 18,
      color: rgb(0.04, 0.12, 0.23),
    });
    const numText = `${i + 1}`;
    const numWidth = fontBold.widthOfTextAtSize(numText, 9);
    currentPage.drawText(numText, {
      x: MARGIN_LEFT + (24 - numWidth) / 2,
      y: currentY - 13,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Question Stem Lines
    let stemY = currentY - 13;
    for (let l = 0; l < stemLines.length; l++) {
      currentPage.drawText(stemLines[l], {
        x: MARGIN_LEFT + 32,
        y: stemY,
        size: 9.5,
        font: l === 0 ? fontBold : fontRegular,
        color: rgb(0.1, 0.15, 0.22),
      });
      stemY -= 13;
    }
    currentY = stemY - 6;

    // Options List
    const options = q.options || [];
    for (const opt of options) {
      const optText = `${opt.label}. ${opt.content}`;
      const optLines = wrapText(optText, fontRegular, 8.5, CONTENT_WIDTH - 45);
      const optHeight = optLines.length * 12 + 4;
      ensureSpace(optHeight);

      // Highlight correct option
      const isCorrect = Boolean(opt.is_correct);
      if (isCorrect) {
        currentPage.drawRectangle({
          x: MARGIN_LEFT + 30,
          y: currentY - optHeight + 4,
          width: CONTENT_WIDTH - 35,
          height: optHeight,
          color: rgb(0.92, 0.98, 0.94),
        });
      }

      let optY = currentY - 10;
      for (const optLine of optLines) {
        currentPage.drawText(optLine, {
          x: MARGIN_LEFT + 36,
          y: optY,
          size: 8.5,
          font: isCorrect ? fontBold : fontRegular,
          color: isCorrect ? rgb(0.06, 0.45, 0.22) : rgb(0.2, 0.25, 0.32),
        });
        optY -= 12;
      }

      // Add score value badge for option_value mode
      if (q.scoring_mode === "option_value" && opt.score_value !== null && opt.score_value !== undefined) {
        const scoreStr = `(Poin: ${opt.score_value})`;
        currentPage.drawText(scoreStr, {
          x: PAGE_WIDTH - MARGIN_RIGHT - 55,
          y: currentY - 10,
          size: 8,
          font: fontBold,
          color: rgb(0.85, 0.45, 0.05),
        });
      }

      currentY -= optHeight;
    }

    // Explanation Box
    const explanationText = q.explanation?.trim() || "Belum ada pembahasan khusus untuk soal ini.";
    const expLines = wrapText(`PEMBAHASAN: ${explanationText}`, fontRegular, 8.5, CONTENT_WIDTH - 24);
    const expBoxHeight = expLines.length * 12 + 16;

    ensureSpace(expBoxHeight + 15);

    // Light blue box for explanation
    currentPage.drawRectangle({
      x: MARGIN_LEFT + 15,
      y: currentY - expBoxHeight,
      width: CONTENT_WIDTH - 20,
      height: expBoxHeight,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.8, 0.86, 0.92),
      borderWidth: 0.75,
    });

    let expY = currentY - 12;
    for (let l = 0; l < expLines.length; l++) {
      const isHeader = l === 0 && expLines[0].startsWith("PEMBAHASAN:");
      currentPage.drawText(expLines[l], {
        x: MARGIN_LEFT + 25,
        y: expY,
        size: 8.5,
        font: isHeader ? fontBold : fontRegular,
        color: rgb(0.12, 0.2, 0.3),
      });
      expY -= 12;
    }

    currentY -= expBoxHeight + 16;
  }

  // -------------------------------------------------------------
  // 3. Draw Page Numbers on All Pages
  // -------------------------------------------------------------
  const totalPages = pdfDoc.getPageCount();
  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.getPage(p);

    // Footer rule
    page.drawLine({
      start: { x: MARGIN_LEFT, y: 36 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 36 },
      thickness: 0.75,
      color: rgb(0.85, 0.88, 0.92),
    });

    page.drawText("Dokumen Rahasia & Hak Cipta NavyTryout — Dilarang memperbanyak tanpa izin tertulis.", {
      x: MARGIN_LEFT,
      y: 24,
      size: 7.5,
      font: fontOblique,
      color: rgb(0.45, 0.5, 0.58),
    });

    const pageStr = `Halaman ${p + 1} dari ${totalPages}`;
    const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 8);
    page.drawText(pageStr, {
      x: PAGE_WIDTH - MARGIN_RIGHT - pageStrWidth,
      y: 24,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });
  }

  return await pdfDoc.save();
}
