import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppRole, Profile } from "@/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { supabase, user: null };
    }
    return { supabase, user };
  } catch (err) {
    console.warn("getCurrentUser exception:", err);
    return { supabase, user: null };
  }
}

export async function getCurrentProfile(): Promise<{ profile: Profile | null; user: any; supabase: any }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { profile: null, user: null, supabase };

  let profile: any = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  } catch (e) {
    console.warn("Profile query error:", e);
  }

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
  let profile: any = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  } catch (e) {
    console.warn("requireAdmin profile error:", e);
  }

  const role = profile?.role || user.user_metadata?.role || (user.email?.includes("admin") ? "super_admin" : "participant");

  if (!["admin", "super_admin"].includes(role)) {
    redirect("/dashboard");
  }

  const fallbackProfile: Profile = profile || {
    id: user.id,
    email: user.email || "",
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
    role: role as AppRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { supabase, user, profile: fallbackProfile, role: role as AppRole };
}
