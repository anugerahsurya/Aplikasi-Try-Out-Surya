import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const DEFAULT_SUPABASE_URL = "https://kkmylhyvmfpmprzghmix.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_5ez6A4fwVYYuqGLBjsO2fA_4BCLHaY-";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies
          }
        },
      },
    }
  );
}

