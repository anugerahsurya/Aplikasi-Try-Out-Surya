import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, FileText, Settings, ShieldAlert, Users, Clock, Trophy } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function ExamSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireAdmin();

  const { data: exam, error } = await supabase
    .from("exams")
    .select("*, questions(id), exam_assignments(id)")
    .eq("id", id)
    .single();

  if (error || !exam) {
    notFound();
  }

  async function updateExamSettings(formData: FormData) {
    "use server";
    const { supabase: s } = await requireAdmin();

    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const instructions = formData.get("instructions") as string;
    const durationMinutes = parseInt(formData.get("duration_minutes") as string, 10) || 60;
    const status = formData.get("status") as string;
    const resultReleaseAt = formData.get("result_release_at") as string;
    const shuffleQuestions = formData.get("shuffle_questions") === "on";
    const shuffleOptions = formData.get("shuffle_options") === "on";
    const requireFullscreen = formData.get("require_fullscreen") === "on";
    const disableClipboard = formData.get("disable_clipboard") === "on";
    const autoSubmitAfterViolations =
      parseInt(formData.get("auto_submit_after_violations") as string, 10) || 0;

    const securityPolicy = {
      require_fullscreen: requireFullscreen,
      disable_clipboard: disableClipboard,
      log_focus_loss: true,
      log_connectivity: true,
      warn_after_violations: 1,
      auto_submit_after_violations: autoSubmitAfterViolations,
    };

    await s
      .from("exams")
      .update({
        title,
        slug,
        description,
        instructions,
        duration_minutes: durationMinutes,
        status,
        result_release_at: resultReleaseAt ? new Date(resultReleaseAt).toISOString() : null,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        security_policy: securityPolicy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath(`/admin/exams/${id}`);
  }

  const policy = exam.security_policy || {};

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Link
            href="/admin/exams"
            className="btn btn-ghost btn-sm"
            style={{ paddingLeft: 0 }}
          >
            <ArrowLeft size={16} /> Kembali ke Daftar Ujian
          </Link>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/admin/exams/${exam.id}/leaderboard`}
              className="btn btn-outline btn-sm"
            >
              <Trophy size={14} color="#d97706" /> Rekap & Peringkat
            </Link>
            <Link
              href={`/admin/exams/${exam.id}/questions`}
              className="btn btn-primary btn-sm"
            >
              <FileText size={15} /> Kelola Bank Soal ({exam.questions?.length || 0})
            </Link>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span className="eyebrow">Konfigurasi Ujian</span>
          <h1 style={{ fontSize: "1.85rem", margin: "4px 0" }}>Pengaturan & Kebijakan Ujian</h1>
          <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
            Ubah rincian, durasi, jadwal rilis hasil, dan parameter pengawasan
          </p>
        </div>

        <form action={updateExamSettings} style={{ display: "grid", gap: 24 }}>
          {/* General Information */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 18 }}>Informasi Umum</h3>

            <div style={{ display: "grid", gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="title">
                  Judul Ujian
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className="field"
                  defaultValue={exam.title}
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="slug">
                    Slug URL
                  </label>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    className="field"
                    defaultValue={exam.slug}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="duration_minutes">
                    Durasi (Menit)
                  </label>
                  <input
                    id="duration_minutes"
                    name="duration_minutes"
                    type="number"
                    min={1}
                    defaultValue={exam.duration_minutes}
                    className="field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="status">
                    Status Publikasi
                  </label>
                  <select id="status" name="status" className="field" defaultValue={exam.status}>
                    <option value="draft">Draft (Tertutup)</option>
                    <option value="published">Published (Aktif untuk peserta)</option>
                    <option value="archived">Archived (Arsip)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="result_release_at">
                    Jadwal Rilis Hasil & Pembahasan
                  </label>
                  <input
                    id="result_release_at"
                    name="result_release_at"
                    type="datetime-local"
                    className="field"
                    defaultValue={
                      exam.result_release_at
                        ? new Date(exam.result_release_at).toISOString().slice(0, 16)
                        : ""
                    }
                  />
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    Kosongkan jika hasil dapat langsung dilihat setelah submit.
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="description">
                  Deskripsi Singkat
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="field"
                  defaultValue={exam.description || ""}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="instructions">
                  Petunjuk Peserta
                </label>
                <textarea
                  id="instructions"
                  name="instructions"
                  className="field"
                  defaultValue={exam.instructions || ""}
                />
              </div>
            </div>
          </div>

          {/* Randomization & Security */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={18} color="var(--navy-600)" /> Kebijakan Keamanan & Pengacakan
            </h3>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 24 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input
                    type="checkbox"
                    name="shuffle_questions"
                    defaultChecked={exam.shuffle_questions}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Acak urutan nomor butir soal</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input
                    type="checkbox"
                    name="shuffle_options"
                    defaultChecked={exam.shuffle_options}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Acak urutan opsi jawaban (A-E)</span>
                </label>
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input
                    type="checkbox"
                    name="require_fullscreen"
                    defaultChecked={policy.require_fullscreen !== false}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Wajibkan mode layar penuh (Fullscreen)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input
                    type="checkbox"
                    name="disable_clipboard"
                    defaultChecked={policy.disable_clipboard !== false}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Nonaktifkan Clipboard & Klik Kanan (Anti-Copy)</span>
                </label>
              </div>

              <div className="form-group" style={{ margin: "12px 0 0", maxWidth: 380 }}>
                <label className="form-label" htmlFor="auto_submit_after_violations">
                  Batas Pelanggaran Sebelum Auto-Submit
                </label>
                <input
                  id="auto_submit_after_violations"
                  name="auto_submit_after_violations"
                  type="number"
                  min={0}
                  defaultValue={policy.auto_submit_after_violations || 0}
                  className="field"
                />
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  0 = Nonaktif (hanya dicatat di log audit).
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Link href="/admin/exams" className="btn btn-outline">
              Batal
            </Link>
            <button type="submit" className="btn btn-primary btn-lg">
              <Save size={18} /> Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
  );
}
