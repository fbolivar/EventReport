import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Redirects to a short-lived signed URL for a stored report.
 *
 * The row lookup goes through RLS, so a report belonging to another tenant
 * simply does not exist for this user: no separate authorization check is
 * needed, and none can be forgotten.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("storage_path, status")
    .eq("id", reportId)
    .maybeSingle();

  if (!report?.storage_path || report.status !== "ready") {
    return NextResponse.json({ error: "informe no disponible" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(report.storage_path, 300);

  if (error || !data) {
    return NextResponse.json({ error: "no se pudo firmar el enlace" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
