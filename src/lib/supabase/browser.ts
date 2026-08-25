"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kkmylhyvmfpmprzghmix.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_5ez6A4fwVYYuqGLBjsO2fA_4BCLHaY-";

  return createBrowserClient(supabaseUrl, supabaseKey);
}
