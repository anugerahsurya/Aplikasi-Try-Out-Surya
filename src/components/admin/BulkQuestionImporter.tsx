"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2, Download, Copy, Check, Sparkles } from "lucide-react";

interface BulkQuestionImporterProps {
  examId: string;
}

const TEMPLATE_JSON_DATA = [
  {
    "section_title": "Tes Wawasan Kebangsaan (TWK)",
    "stem": "Lembaga negara yang berwenang memutus sengketa kewenangan lembaga negara yang kewenangannya diberikan oleh Undang-Undang Dasar adalah...",
    "scoring_mode": "correctness",
    "correct_score": 5,
    "incorrect_score": 0,
    "blank_score": 0,
    "explanation": "Sesuai Pasal 24C UUD 1945, Mahkamah Konstitusi berwenang mengadili pada tingkat pertama dan terakhir yang putusannya bersifat final untuk memutus sengketa kewenangan lembaga negara.",
    "options": [
      { "label": "A", "content": "Mahkamah Agung", "is_correct": false },
      { "label": "B", "content": "Mahkamah Konstitusi", "is_correct": true },
      { "label": "C", "content": "Komisi Yudisial", "is_correct": false },
      { "label": "D", "content": "Dewan Perwakilan Rakyat", "is_correct": false },
      { "label": "E", "content": "Badan Pemeriksa Keuangan", "is_correct": false }
    ]
  },
  {
    "section_title": "Tes Intelegensia Umum (TIU)",
    "stem": "Jika SEMUA peserta ujian membawa kartu ujian, dan SEBAGIAN peserta membawa penggaris, maka simpulan yang paling tepat adalah...",
    "scoring_mode": "correctness",
    "correct_score": 5,
    "incorrect_score": 0,
    "blank_score": 0,
    "explanation": "Karena sebagian peserta membawa penggaris dan seluruh peserta membawa kartu ujian, maka sebagian peserta yang membawa kartu ujian juga membawa penggaris.",
    "options": [
      { "label": "A", "content": "Sebagian peserta yang membawa kartu ujian membawa penggaris", "is_correct": true },
      { "label": "B", "content": "Semua peserta membawa kartu ujian dan penggaris", "is_correct": false },
      { "label": "C", "content": "Peserta yang tidak membawa penggaris tidak membawa kartu ujian", "is_correct": false },
      { "label": "D", "content": "Semua peserta yang membawa penggaris tidak membawa kartu ujian", "is_correct": false },
      { "label": "E", "content": "Tidak dapat ditarik simpulan", "is_correct": false }
    ]
  },
  {
    "section_title": "Tes Karakteristik Pribadi (TKP)",
    "stem": "Saat Anda sedang menyelesaikan laporan mendesak yang harus diserahkan sore ini, rekan kerja satu tim tiba-tiba meminta bantuan menyelesaikan tugasnya karena ia kurang paham. Sikap Anda adalah...",
    "scoring_mode": "option_value",
    "correct_score": 0,
    "incorrect_score": 0,
    "blank_score": 0,
    "explanation": "Poin 5 diberikan pada sikap kerja profesional: menuntaskan tanggung jawab pokok lalu sigap membantu rekan kerja.",
    "options": [
      { "label": "A", "content": "Menolak secara tegas karena pekerjaan saya jauh lebih penting.", "score_value": 1 },
      { "label": "B", "content": "Meninggalkan tugas saya sementara demi membantu rekan tim tersebut.", "score_value": 2 },
      { "label": "C", "content": "Menyuruh rekan lain yang terlihat santai untuk membantunya.", "score_value": 3 },
      { "label": "D", "content": "Memberikan petunjuk pokok cara penyelesaiannya secara ringkas lalu fokus menyelesaikan tugas saya.", "score_value": 4 },
      { "label": "E", "content": "Fokus menuntaskan laporan saya terlebih dahulu, kemudian langsung membantunya hingga selesai.", "score_value": 5 }
    ]
  }
];

export function BulkQuestionImporter({ examId }: BulkQuestionImporterProps) {
  const router = useRouter();
  const [jsonText, setJsonText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [progressStatusText, setProgressStatusText] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Download template JSON file directly
  const handleDownloadTemplate = () => {
    const jsonString = JSON.stringify(TEMPLATE_JSON_DATA, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_soal_tryout.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySample = () => {
    setJsonText(JSON.stringify(TEMPLATE_JSON_DATA, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) return;

    setIsLoading(true);
    setImportProgress(15);
    setProgressStatusText("Memeriksa dan memvalidasi struktur format JSON...");
    setStatus(null);

    try {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch (parseErr) {
        setStatus({ type: "error", message: "Format JSON tidak valid. Pastikan struktur kurung dan tanda petik sudah benar." });
        setIsLoading(false);
        setImportProgress(0);
        return;
      }

      const questionsList = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
      setImportProgress(40);
      setProgressStatusText(`Menyiapkan ${questionsList.length} butir soal ke database...`);

      // Progress animation step
      const progressTimer = setTimeout(() => {
        setImportProgress(75);
        setProgressStatusText(`Menyimpan opsi jawaban dan bobot penilaian...`);
      }, 400);

      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          questions: questionsList,
        }),
      });

      clearTimeout(progressTimer);
      const data = await res.json();

      if (res.ok) {
        setImportProgress(100);
        setProgressStatusText("Impor soal selesai 100%!");
        setStatus({ type: "success", message: data.message });
        setJsonText("");
        router.refresh();
      } else {
        setImportProgress(0);
        setStatus({ type: "error", message: data.error || "Gagal mengimpor butir soal." });
      }
    } catch (err: any) {
      setImportProgress(0);
      setStatus({ type: "error", message: "Terjadi kesalahan koneksi saat mengimpor soal." });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 600);
    }
  };

  return (
    <div className="card" style={{ padding: "24px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <span className="eyebrow">Input Massal (Bulk Importer)</span>
          <h3 style={{ fontSize: "1.2rem", margin: "2px 0 4px" }}>Impor Soal via Template JSON</h3>
          <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>
            Unduh format template, isi bank soal Anda, lalu upload kembali berkas JSON ke sistem.
          </p>
        </div>

        {/* Action Buttons: Download Template & Load Example */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn btn-primary btn-sm"
            style={{ fontSize: "0.8rem" }}
            title="Unduh file template_soal_tryout.json ke komputer"
          >
            <Download size={14} /> Unduh Template JSON
          </button>

          <button
            type="button"
            onClick={handleCopySample}
            className="btn btn-outline btn-sm"
            style={{ fontSize: "0.8rem" }}
          >
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            {copied ? "Format Ditempel!" : "Lihat Contoh di Sini"}
          </button>
        </div>
      </div>

      {/* Real-time Import Progress Bar */}
      {isLoading && (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface-secondary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: "0.86rem" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={15} className="animate-spin" color="var(--brand-accent)" />
              {progressStatusText}
            </span>
            <span style={{ fontWeight: 800, color: "var(--brand-accent)" }}>{importProgress}%</span>
          </div>

          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 6,
              background: "var(--border-color)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${importProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)",
                borderRadius: 6,
                boxShadow: "0 0 10px rgba(37, 99, 235, 0.5)",
                transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
        </div>
      )}

      {status && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            marginBottom: 16,
            fontSize: "0.86rem",
            fontWeight: 600,
            background: status.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
            color: status.type === "success" ? "var(--success)" : "var(--danger)",
            border: `1px solid ${status.type === "success" ? "var(--success-border)" : "var(--danger-border)"}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleImport} style={{ display: "grid", gap: 14 }}>
        {/* Upload File Box */}
        <div
          style={{
            padding: "16px",
            background: "var(--bg-surface-secondary)",
            border: "1.5px dashed var(--border-color)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileJson size={28} color="var(--brand-accent)" />
            <div>
              <strong style={{ fontSize: "0.88rem", display: "block" }}>
                Unggah Berkas .JSON Soal
              </strong>
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                Pilih file JSON yang telah Anda isi di komputer Anda
              </span>
            </div>
          </div>

          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer" }}>
            <Upload size={14} /> Pilih File .JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* JSON Preview/Editor */}
        <div>
          <label className="form-label" style={{ marginBottom: 6 }}>
            <span>Kode / Isi Data JSON Soal:</span>
            {jsonText.trim() && (
              <span style={{ fontSize: "0.78rem", color: "var(--brand-accent)", fontWeight: 600 }}>
                Siap Diimpor
              </span>
            )}
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Klik 'Unduh Template JSON' di atas untuk template file, atau tempel kode JSON soal di sini..."
            rows={8}
            className="field"
            style={{
              fontFamily: "Consolas, Monaco, monospace",
              fontSize: "0.84rem",
              lineHeight: 1.4,
              whiteSpace: "pre",
            }}
            required
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="submit"
            disabled={isLoading || !jsonText.trim()}
            className="btn btn-primary btn-md"
            style={{ minWidth: 200 }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Memproses Soal ke Database...
              </>
            ) : (
              <>
                <Upload size={16} /> Impor Seluruh Soal Sekarang
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
