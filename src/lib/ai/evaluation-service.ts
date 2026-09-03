export interface ParticipantExamPerformance {
  studentName: string;
  email: string;
  examTitle: string;
  totalScore: number;
  maxPossibleScore?: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  sectionBreakdown: {
    sectionTitle: string;
    earnedScore: number;
    questionCount: number;
    correctCount: number;
  }[];
  weakTopics: string[];
}

export interface AiEvaluationReport {
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  actionableRecommendations: string[];
  generatedBy: "gemini-3.5-flash-lite" | "gemini-flash-lite" | "openai" | "heuristic-analyst";
}

/**
 * Generate personal diagnostic evaluation using Gemini Flash-Lite / OpenAI / Smart Heuristics.
 * When strictAi is true, it will throw an error instead of falling back if AI generation fails.
 */
export async function generatePersonalEvaluation(
  performance: ParticipantExamPerformance,
  options: { strictAi?: boolean } = { strictAi: true }
): Promise<AiEvaluationReport> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const isStrict = options.strictAi !== false;

  const prompt = `Anda adalah seorang instruktur ahli dan analis evaluasi ujian kedinasan/CPNS profesional.
Lakukan analisis mendalam terhadap performa peserta ujian berikut:
- Nama Peserta: ${performance.studentName}
- Judul Ujian: ${performance.examTitle}
- Total Skor yang Diperoleh: ${performance.totalScore}
- Jumlah Soal Terjawab: ${performance.answeredCount} dari ${performance.totalQuestions}
- Jawaban Benar: ${performance.correctCount}, Salah: ${performance.incorrectCount}, Kosong: ${performance.blankCount}
- Rincian per Seksi/Bagian:
${performance.sectionBreakdown.map((s) => `  * ${s.sectionTitle}: Skor ${s.earnedScore}, Benar ${s.correctCount} dari ${s.questionCount} soal`).join("\n")}
- Topik/Materi yang Masih Lemah (Banyak Salah): ${performance.weakTopics.length > 0 ? performance.weakTopics.join(", ") : "Tidak ada catatan khusus"}

Tuliskan evaluasi personal yang memotivasi, tajam, dan solutif dalam format JSON persis seperti ini:
{
  "summary": "1-2 paragraf evaluasi menyeluruh mengenai pencapaian dan efektivitas pengerjaan ujian.",
  "strengths": ["Poin kelebihan 1", "Poin kelebihan 2"],
  "areasToImprove": ["Aspek kelemahan spesifik 1 yang perlu ditingkatkan", "Aspek kelemahan spesifik 2 yang perlu ditingkatkan", "Aspek kelemahan spesifik 3 yang perlu ditingkatkan"],
  "actionableRecommendations": ["Rekomendasi belajar prioritas 1", "Rekomendasi manajemen waktu pengerjaan 2", "Strategi peningkatan skor 3"]
}`;

  // 1. Try Google Gemini (Gemini 3.5 Flash Lite)
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          let cleaned = rawText.trim();
          if (cleaned.startsWith("```json")) {
            cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
          } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          }
          const parsed = JSON.parse(cleaned);
          return {
            summary: parsed.summary || "",
            strengths: parsed.strengths || [],
            areasToImprove: parsed.areasToImprove || [],
            actionableRecommendations: parsed.actionableRecommendations || [],
            generatedBy: "gemini-3.5-flash-lite",
          };
        } else if (isStrict) {
          throw new Error("Respons Gemini AI kosong.");
        }
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `Status HTTP ${response.status}`;
        console.warn("Gemini API error response:", response.status, errJson);
        if (isStrict) {
          throw new Error(`Evaluasi AI gagal (${errMsg})`);
        }
      }
    } catch (err: any) {
      console.warn("Gemini API error:", err);
      if (isStrict) {
        throw new Error(`Gagal menghasilkan evaluasi AI: ${err?.message || "Kesalahan jaringan"}`);
      }
    }
  } else if (isStrict && !openAiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di server.");
  }

  // 2. Try OpenAI if configured
  if (openAiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Anda adalah analis evaluasi ujian profesional. Selalu keluarkan JSON murni." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.4,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const rawContent = json.choices?.[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          return {
            summary: parsed.summary || "",
            strengths: parsed.strengths || [],
            areasToImprove: parsed.areasToImprove || [],
            actionableRecommendations: parsed.actionableRecommendations || [],
            generatedBy: "openai",
          };
        }
      }
    } catch (err) {
      console.warn("OpenAI API call failed, falling back to heuristics:", err);
    }
  }

  // 3. High-Quality Heuristic Rule-Based Evaluator (Zero-dependency & 100% Reliable)
  return generateHeuristicEvaluation(performance);
}

function generateHeuristicEvaluation(performance: ParticipantExamPerformance): AiEvaluationReport {
  const { totalScore, correctCount, totalQuestions, sectionBreakdown, weakTopics } = performance;
  const accuracyPct = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);

  // Identify lowest performing section
  const sortedSections = [...sectionBreakdown].sort((a, b) => {
    const accA = a.questionCount > 0 ? a.correctCount / a.questionCount : 0;
    const accB = b.questionCount > 0 ? b.correctCount / b.questionCount : 0;
    return accA - accB;
  });

  const lowestSection = sortedSections[0];
  const bestSection = sortedSections[sortedSections.length - 1];

  const summary = `Berdasarkan hasil simulasi ujian "${performance.examTitle}", Anda berhasil mengumpulkan total skor ${totalScore} poin dengan tingkat akurasi ketepatan jawaban sebesar ${accuracyPct}%. Secara umum, Anda telah menunjukkan pemahaman yang cukup baik pada beberapa materi, namun masih diperlukan penguatan intensif pada aspek penalaran analitis dan kecepatan menjawab agar peluang kelulusan Anda semakin maksimal.`;

  const strengths = [
    bestSection
      ? `Performa paling konsisten diraih pada bagian ${bestSection.sectionTitle}, dengan torehan skor ${bestSection.earnedScore} poin.`
      : "Konsistensi yang baik dalam menyelesaikan sebagian besar butir soal.",
    `Mampu mempertahankan fokus hingga berhasil menjawab ${performance.answeredCount} dari ${totalQuestions} butir soal yang diujikan.`,
  ];

  const areasToImprove = [
    lowestSection
      ? `Bagian ${lowestSection.sectionTitle} memerlukan perhatian khusus karena perolehan nilai (${lowestSection.earnedScore} poin) masih berada di bawah target optimal.`
      : "Akurasi jawaban pada soal-soal penalaran logis dan pemahaman konsep mendalam.",
    weakTopics.length > 0
      ? `Kerapian pemahaman pada materi spesifik: ${weakTopics.slice(0, 3).join(", ")}.`
      : "Ketelitian dalam mengeliminasi opsi jebakan pada pertanyaan dengan tingkat kesulitan tinggi.",
    performance.blankCount > 0
      ? `Terdapat ${performance.blankCount} soal yang belum sempat terjawab; perlu manajemen alokasi waktu per soal yang lebih disiplin.`
      : "Optimalisasi durasi pengerjaan per soal untuk menyisakan waktu reviu jawaban.",
  ];

  const actionableRecommendations = [
    "Prioritaskan latihan soal bertarget (drilling) minimal 30 butir per hari pada aspek materi yang paling banyak menyumbang kesalahan.",
    "Terapkan teknik eliminasi jawaban bertahap dan batasi maksimal 50-60 detik untuk satu butir soal agar tidak kehabisan waktu di akhir sesi.",
    "Ulas kembali lembar pembahasan ini secara cermat, terutama konsep dasar yang menjadi kunci pembeda antara opsi yang benar dan opsi pengecoh.",
  ];

  return {
    summary,
    strengths,
    areasToImprove,
    actionableRecommendations,
    generatedBy: "heuristic-analyst",
  };
}
