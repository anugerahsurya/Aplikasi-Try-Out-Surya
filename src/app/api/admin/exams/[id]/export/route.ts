import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdmin();

    // Fetch exam details
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("title")
      .eq("id", id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: "Ujian tidak ditemukan." }, { status: 404 });
    }

    // Fetch completed/submitted attempts ordered by score desc
    const { data: attempts, error: attError } = await supabase
      .from("attempts")
      .select("*, profile:profiles(full_name, email, phone, institution)")
      .eq("exam_id", id)
      .in("status", ["submitted", "expired"])
      .order("score", { ascending: false });

    if (attError) {
      return NextResponse.json({ error: attError.message }, { status: 500 });
    }

    // Generate CSV data with Excel UTF-8 BOM
    const headers = [
      "Peringkat",
      "Nama Lengkap",
      "Email",
      "No HP",
      "Institusi",
      "Skor Akhir",
      "Status",
      "Waktu Mulai",
      "Waktu Selesai",
      "Pelanggaran Keamanan",
    ];

    const rows = (attempts || []).map((att: any, idx: number) => {
      const p = att.profile || {};
      const durationMins = att.submitted_at && att.started_at
        ? Math.round((new Date(att.submitted_at).getTime() - new Date(att.started_at).getTime()) / 60000)
        : 0;

      return [
        idx + 1,
        `"${(p.full_name || "Tanpa Nama").replace(/"/g, '""')}"`,
        `"${(p.email || "").replace(/"/g, '""')}"`,
        `"${(p.phone || "-").replace(/"/g, '""')}"`,
        `"${(p.institution || "Umum").replace(/"/g, '""')}"`,
        att.score ?? 0,
        att.status === "submitted" ? "Selesai" : "Waktu Habis",
        `"${new Date(att.started_at).toLocaleString("id-ID")}"`,
        att.submitted_at ? `"${new Date(att.submitted_at).toLocaleString("id-ID")}"` : '"-"',
        att.violation_count || 0,
      ].join(",");
    });

    // Excel UTF-8 BOM (\uFEFF) ensures Excel displays Indonesian characters cleanly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Hasil_Ujian_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal mengunduh berkas Excel." }, { status: 500 });
  }
}
