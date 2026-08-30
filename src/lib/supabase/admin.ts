import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://kkmylhyvmfpmprzghmix.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_5ez6A4fwVYYuqGLBjsO2fA_4BCLHaY-";

export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  const keyToUse =
    serviceRoleKey && !serviceRoleKey.includes("placeholder") && serviceRoleKey.trim().length > 5
      ? serviceRoleKey.trim()
      : anonKey;

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

