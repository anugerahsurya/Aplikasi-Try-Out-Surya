import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ParticipantManager } from "@/components/admin/ParticipantManager";
import { Exam, Profile } from "@/types";

export default async function AdminParticipantsPage() {
  const { supabase, user, profile } = await requireAdmin();

  // Fetch participants with their assigned exams
  const { data: participants } = await supabase
    .from("profiles")
    .select("*, assignments:exam_assignments(id, exam_id, exam:exams(title))")
    .order("created_at", { ascending: false });

  // Fetch available exams
  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .order("title", { ascending: true });

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name || ""}
      userRole={profile?.role || "admin"}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <ParticipantManager
          participants={(participants || []) as any}
          exams={(exams || []) as Exam[]}
        />
      </div>
    </AppShell>
  );
}
