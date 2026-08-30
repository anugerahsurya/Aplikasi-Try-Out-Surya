"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: boolean };

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const password = (formData.get("password") as string || "").trim();

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let targetPath = "/dashboard";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data?.user) {
      const isInvalid = error?.message?.toLowerCase().includes("invalid login credentials") || error?.status === 400;
      return {
        error: isInvalid
          ? "Email atau password yang Anda masukkan salah. Silakan periksa kembali."
          : (error?.message || "Gagal masuk. Periksa kembali akun Anda."),
      };
    }

    try {
      // Fetch role and update last_sign_in_at in parallel/cleanly
      const [{ data: profile }] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq("id", data.user.id),
      ]);

      const role = profile?.role || data.user.user_metadata?.role || (parsed.data.email.includes("admin") ? "super_admin" : "participant");
      if (role === "admin" || role === "super_admin") {
        targetPath = "/admin/dashboard";
      }
    } catch (profileErr) {
      console.warn("Profile role check skipped:", profileErr);
    }
  } catch (err: any) {
    console.error("Login action exception:", err);
    return { error: "Terjadi kesalahan sistem saat memproses login. Silakan coba lagi." };
  }


  redirect(targetPath);
}
