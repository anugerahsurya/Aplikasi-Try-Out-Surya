import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, ShieldAlert, Settings2 } from "lucide-react";

export default async function NewExamPage() {
  const { user, profile } = await requireAdmin();

  async function createExam(formData: FormData) {
    "use server";
    const { supabase, user: u } = await requireAdmin();

    const title = formData.get("title") as string;
    const slug = (formData.get("slug") as string) || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const description = formData.get("description") as string;
    const instructions = formData.get("instructions") as string;
    const durationMinutes = parseInt(formData.get("duration_minutes") as string, 10) || 60;
    const status = (formData.get("status") as string) || "draft";
    const shuffleQuestions = formData.get("shuffle_questions") === "on";
    const shuffleOptions = formData.get("shuffle_options") === "on";
    const requireFullscreen = formData.get("require_fullscreen") === "on";
    const disableClipboard = formData.get("disable_clipboard") === "on";
    const autoSubmitAfterViolations = parseInt(formData.get("auto_submit_after_violations") as string, 10) || 0;

    const securityPolicy = {
      require_fullscreen: requireFullscreen,
      disable_clipboard: disableClipboard,
      log_focus_loss: true,
      log_connectivity: true,
      warn_after_violations: 1,
      auto_submit_after_violations: autoSubmitAfterViolations,
    };

    const { data: newExam, error } = await supabase
      .from("exams")
      .insert({
        title,
        slug,
        description,
        instructions,
        duration_minutes: durationMinutes,
        status,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        security_policy: securityPolicy,
        created_by: u.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create exam error:", error);
      throw new Error(error.message);
    }

    redirect(`/admin/exams/${newExam.id}/questions`);
  }

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "admin"}
    >
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <Link
          href="/admin/exams"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 18, paddingLeft: 0 }}
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Ujian
        </Link>

        <div style={{ marginBottom: 24 }}>
          <span className="eyebrow">Form Pembuatan</span>
          <h1 style={{ fontSize: "1.85rem", margin: "4px 0" }}>Buat Ujian Baru</h1>
          <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
            Lengkapi data umum ujian, durasi pengerjaan, dan kebijakan keamanan
          </p>
        </div>

        <form action={createExam} style={{ display: "grid", gap: 24 }}>
          {/* General Information */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 18 }}>Informasi Umum Ujian</h3>

            <div style={{ display: "grid", gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="title">
                  Judul Ujian *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className="field"
                  placeholder="Contoh: Try Out SKD CPNS 2026 - Paket 1"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="slug">
                    URL Slug (Unik)
                  </label>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    className="field"
                    placeholder="skd-cpns-2026-paket-1"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="duration_minutes">
                    Durasi Pengerjaan (Menit) *
                  </label>
                  <input
                    id="duration_minutes"
                    name="duration_minutes"
                    type="number"
                    min={1}
                    defaultValue={90}
                    className="field"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="description">
                  Deskripsi Ringkas
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="field"
                  placeholder="Penjelasan singkat mengenai materi atau kelompok ujian ini."
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="instructions">
                  Petunjuk & Tata Tertib Peserta
                </label>
                <textarea
                  id="instructions"
                  name="instructions"
                  className="field"
                  placeholder="Petunjuk pengerjaan yang akan ditampilkan sebelum peserta menekan tombol mulai."
                />
              </div>
            </div>
          </div>

          {/* Settings & Randomization */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <Settings2 size={18} color="var(--navy-600)" /> Pengaturan Soal & Status
            </h3>

            <div style={{ display: "grid", gap: 16 }}>
              <div className="grid grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="status">
                    Status Publikasi
                  </label>
                  <select id="status" name="status" className="field" defaultValue="draft">
                    <option value="draft">Draft (Belum dapat diakses peserta)</option>
                    <option value="published">Published (Dapat diakses peserta yang di-assign)</option>
                    <option value="archived">Archived (Arsip)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input type="checkbox" name="shuffle_questions" style={{ width: 16, height: 16 }} />
                  <span>Acak urutan nomor butir soal per peserta</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input type="checkbox" name="shuffle_options" style={{ width: 16, height: 16 }} />
                  <span>Acak urutan pilihan opsi (A-E)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Security Policy */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={18} color="var(--navy-600)" /> Kebijakan Keamanan Anti-Kecurangan
            </h3>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input type="checkbox" name="require_fullscreen" defaultChecked style={{ width: 16, height: 16 }} />
                  <span>Wajibkan Layar Penuh (Fullscreen) selama ujian</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.92rem" }}>
                  <input type="checkbox" name="disable_clipboard" defaultChecked style={{ width: 16, height: 16 }} />
                  <span>Nonaktifkan Clipboard (Copy, Cut, Paste, Klik Kanan)</span>
                </label>
              </div>

              <div className="form-group" style={{ margin: "12px 0 0", maxWidth: 380 }}>
                <label className="form-label" htmlFor="auto_submit_after_violations">
                  Batas Toleransi Pelanggaran (Auto-Submit)
                </label>
                <input
                  id="auto_submit_after_violations"
                  name="auto_submit_after_violations"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="field"
                />
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  Isi 0 untuk menonaktifkan auto-submit (hanya mencatat log audit & peringatan).
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Link href="/admin/exams" className="btn btn-outline">
              Batal
            </Link>
            <button type="submit" className="btn btn-primary btn-lg">
              <Save size={18} /> Simpan & Lanjut ke Bank Soal
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
