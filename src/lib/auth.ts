import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppRole, Profile } from "@/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getCurrentProfile(): Promise<{ profile: Profile | null; user: any; supabase: any }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { profile: null, user: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { profile: profile as Profile | null, user, supabase };
}

export async function requireUser() {
  const { supabase, user } = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Update last_sign_in_at timestamp for real-time presence tracking
  try {
    await supabase
      .from("profiles")
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq("id", user.id);
  } catch {
    // Non-blocking fallback
  }

  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return { supabase, user, profile: profile as Profile, role: profile.role as AppRole };
}

