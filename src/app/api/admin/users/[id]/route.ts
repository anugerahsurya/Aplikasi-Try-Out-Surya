import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: currentAdmin, role: adminRole } = await requireAdmin();
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: "ID user wajib disertakan" }, { status: 400 });
    }

    // Safety check: Prevent admin from deleting themselves
    if (currentAdmin.id === targetUserId) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check target user's role
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      // Check if user exists in auth only
      const { data: authUser } = await adminClient.auth.admin.getUserById(targetUserId);
      if (!authUser?.user) {
        return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });
      }
    }

    // Protect super_admin / admin accounts from accidental deletion
    if (targetProfile?.role === "super_admin") {
      return NextResponse.json(
        { error: "Akun Super Admin tidak dapat dihapus." },
        { status: 403 }
      );
    }

    if (targetProfile?.role === "admin" && adminRole !== "super_admin") {
      return NextResponse.json(
        { error: "Hanya Super Admin yang dapat menghapus akun Admin." },
        { status: 403 }
      );
    }

    // 1. Delete user attempts and their cascade children
    const { data: userAttempts } = await adminClient
      .from("attempts")
      .select("id")
      .eq("user_id", targetUserId);

    if (userAttempts && userAttempts.length > 0) {
      const attemptIds = userAttempts.map((a) => a.id);
      await adminClient.from("attempt_events").delete().in("attempt_id", attemptIds);
      await adminClient.from("attempt_answers").delete().in("attempt_id", attemptIds);
      await adminClient.from("attempt_question_snapshots").delete().in("attempt_id", attemptIds);
      await adminClient.from("attempts").delete().eq("user_id", targetUserId);
    }

    // 2. Delete exam assignments
    await adminClient.from("exam_assignments").delete().eq("user_id", targetUserId);

    // 3. Delete profile
    await adminClient.from("profiles").delete().eq("id", targetUserId);

    // 4. Delete user from Supabase Auth
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) {
      console.warn("Auth user delete warning:", authDeleteError);
    }

    return NextResponse.json({
      success: true,
      message: `Akun ${targetProfile?.full_name || "peserta"} (${targetProfile?.email || targetUserId}) berhasil dihapus beserta seluruh datanya.`,
    });
  } catch (err: any) {
    console.error("Delete user exception:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan saat menghapus peserta." },
      { status: 500 }
    );
  }
}
