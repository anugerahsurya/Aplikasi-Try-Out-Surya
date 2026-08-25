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
