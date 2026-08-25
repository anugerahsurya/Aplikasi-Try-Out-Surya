import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { UserRound, Mail, Phone, Building2, KeyRound, Shield, Check, Save } from "lucide-react";
import { Profile } from "@/types";
import { revalidatePath } from "next/cache";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  async function updateProfile(formData: FormData) {
    "use server";
    const { supabase: s, user: u } = await requireUser();
    const fullName = formData.get("full_name") as string;
    const phone = formData.get("phone") as string;
    const institution = formData.get("institution") as string;

    await s
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        institution: institution || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.id);

    revalidatePath("/profile");
  }

  async function updatePassword(formData: FormData) {
    "use server";
    const { supabase: s } = await requireUser();
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (newPassword && newPassword === confirmPassword) {
      await s.auth.updateUser({ password: newPassword });
    }
  }

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "participant"}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <span className="eyebrow">Pengaturan Akun</span>
          <h1 style={{ fontSize: "1.85rem", margin: "4px 0" }}>Profil Pengguna</h1>
          <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
            Kelola informasi data diri dan keamanan akun Anda
          </p>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          {/* Profile Details Form */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <UserRound size={18} color="var(--brand-accent)" /> Data Pribadi
            </h3>

            <form action={updateProfile} style={{ display: "grid", gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Akun (Permanen)</label>
                <input
                  type="email"
                  className="field"
                  value={user.email || ""}
                  disabled
                  style={{ background: "var(--bg-surface-secondary)", color: "var(--text-muted)" }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="full_name">
                  Nama Lengkap
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className="field"
                  defaultValue={profile?.full_name || ""}
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="phone">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="field"
                    defaultValue={profile?.phone || ""}
                    placeholder="08123456789"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="institution">
                    Institusi / Sekolah / Instansi
                  </label>
                  <input
                    id="institution"
                    name="institution"
                    type="text"
                    className="field"
                    defaultValue={profile?.institution || ""}
                    placeholder="SMA / Universitas / Umum"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={18} color="var(--brand-accent)" /> Ubah Password
            </h3>

            <form action={updatePassword} style={{ display: "grid", gap: 16 }}>
              <div className="grid grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="new_password">
                    Password Baru
                  </label>
                  <input
                    id="new_password"
                    name="new_password"
                    type="password"
                    className="field"
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="confirm_password">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    className="field"
                    placeholder="Ulangi password"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="btn btn-outline">
                  Perbarui Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
