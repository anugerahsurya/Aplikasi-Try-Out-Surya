import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_SUPABASE_URL = "https://kkmylhyvmfpmprzghmix.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_5ez6A4fwVYYuqGLBjsO2fA_4BCLHaY-";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if route requires auth protection
  const isAdminRoute = pathname.startsWith("/admin");
  const isParticipantProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/tryout") ||
    pathname.startsWith("/exams") ||
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/results");

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  // Fast path: if not a protected route and has no auth token, pass through immediately
  if (!isAdminRoute && !isParticipantProtected && !hasAuthCookie) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      DEFAULT_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_KEY;

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // RBAC: Protect /admin routes from non-admin participants & guests
    if (isAdminRoute) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      // Check role from metadata first to avoid extra database query
      const metaRole = user.user_metadata?.role || user.app_metadata?.role;
      if (metaRole && ["admin", "super_admin"].includes(metaRole)) {
        return supabaseResponse;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || !["admin", "super_admin"].includes(profile.role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    // Protect participant protected routes
    if (isParticipantProtected) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    console.error("Middleware auth verification error:", err);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};

