import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Keep participant online presence updated when accessing pages
  if (profile) {
    const lastSeen = profile.last_sign_in_at ? new Date(profile.last_sign_in_at).getTime() : 0;
    const now = Date.now();
    if (now - lastSeen > 2 * 60 * 1000) {
      supabase
        .from("profiles")
        .update({ last_sign_in_at: new Date(now).toISOString() })
        .eq("id", user.id)
        .then();
    }
  }

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "participant"}
    >
      {children}
    </AppShell>
  );
}
