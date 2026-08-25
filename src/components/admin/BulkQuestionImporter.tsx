"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2, Copy, Check } from "lucide-react";

interface BulkQuestionImporterProps {
  examId: string;
}

const SAMPLE_JSON = `[
  {
    "section_title": "Tes Wawasan Kebangsaan (TWK)",
    "stem": "Lembaga negara yang berwenang memutus sengketa kewenangan lembaga negara...",
    "scoring_mode": "correctness",
    "correct_score": 5,
    "incorrect_score": 0,
    "blank_score": 0,
    "explanation": "Sesuai Pasal 24C UUD 1945, Mahkamah Konstitusi berwenang mengadili...",
    "options": [
      { "label": "A", "content": "Mahkamah Agung", "is_correct": false },
      { "label": "B", "content": "Mahkamah Konstitusi", "is_correct": true },
      { "label": "C", "content": "Komisi Yudisial", "is_correct": false },
      { "label": "D", "content": "Dewan Perwakilan Rakyat", "is_correct": false },
      { "label": "E", "content": "Badan Pemeriksa Keuangan", "is_correct": false }
    ]
  },
  {
    "section_title": "Tes Karakteristik Pribadi (TKP)",
    "stem": "Saat rekan kerja satu tim tiba-tiba meminta bantuan menyelesaikan tugasnya...",
    "scoring_mode": "option_value",
    "correct_score": 0,
    "incorrect_score": 0,
    "blank_score": 0,
    "explanation": "Poin 5 untuk sikap kerja profesional dan saling membantu.",
    "options": [
      { "label": "A", "content": "Menolak secara tegas.", "score_value": 1 },
      { "label": "B", "content": "Meninggalkan tugas sementara.", "score_value": 2 },
      { "label": "C", "content": "Menyuruh rekan lain membantunya.", "score_value": 3 },
      { "label": "D", "content": "Memberikan petunjuk pokok cara penyelesaian.", "score_value": 4 },
      { "label": "E", "content": "Fokus menuntaskan tugas saya lalu langsung membantunya.", "score_value": 5 }
    ]
  }
]`;

export function BulkQuestionImporter({ examId }: BulkQuestionImporterProps) {
  const router = useRouter();
  const [jsonText, setJsonText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopySample = () => {
    setJsonText(SAMPLE_JSON);
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
    setStatus(null);

    try {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch (parseErr) {
        setStatus({ type: "error", message: "Format JSON tidak valid. Pastikan tanda kurung dan koma sudah benar." });
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          questions: Array.isArray(parsedJson) ? parsedJson : [parsedJson],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: data.message });
        setJsonText("");
        router.refresh();
      } else {
        setStatus({ type: "error", message: data.error || "Gagal mengimpor butir soal." });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: "Terjadi kesalahan saat memproses impor." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: "24px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <span className="eyebrow">Input Massal (Bulk Import)</span>
          <h3 style={{ fontSize: "1.2rem", margin: "2px 0 4px" }}>Impor Soal via Template JSON</h3>
          <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>
            Masukkan daftar butir soal sekaligus dengan format JSON standar (mendukung TWK, TIU, TKP 1-5, dan UTBK).
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopySample}
          className="btn btn-outline btn-sm"
          style={{ fontSize: "0.78rem" }}
        >
          {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
          {copied ? "Template Ditempel!" : "Muat Contoh JSON"}
        </button>
      </div>

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
            <FileJson size={14} /> Pilih File .JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            atau tempel langsung kode JSON di bawah ini:
          </span>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`[\n  {\n    "section_title": "Tes Wawasan Kebangsaan (TWK)",\n    "stem": "Pertanyaan soal...",\n    "scoring_mode": "correctness",\n    "correct_score": 5,\n    "incorrect_score": 0,\n    "options": [\n      { "label": "A", "content": "Opsi A", "is_correct": true },\n      { "label": "B", "content": "Opsi B", "is_correct": false }\n    ]\n  }\n]`}
          rows={10}
          className="field"
          style={{
            fontFamily: "Consolas, Monaco, monospace",
            fontSize: "0.84rem",
            lineHeight: 1.4,
            whiteSpace: "pre",
          }}
          required
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="submit"
            disabled={isLoading || !jsonText.trim()}
            className="btn btn-primary btn-md"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Memproses Impor...
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
