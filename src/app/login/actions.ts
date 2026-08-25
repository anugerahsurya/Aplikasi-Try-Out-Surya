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
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let targetPath = "/dashboard";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { error: error.message || "Email atau password yang Anda masukkan salah." };
    }

    if (data?.user) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile && (profile.role === "admin" || profile.role === "super_admin")) {
          targetPath = "/admin/dashboard";
        }
      } catch (profileErr) {
        console.warn("Profile role check skipped:", profileErr);
      }
    }
  } catch (err: any) {
    console.error("Login action exception:", err);
    return { error: "Terjadi kesalahan sistem saat memproses login. Silakan coba lagi." };
  }

  redirect(targetPath);
}
