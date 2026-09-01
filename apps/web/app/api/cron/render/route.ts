import { NextResponse } from "next/server";
import type { FrameworkCode, ReportType } from "@eventreport/schema";

import { renderAndStore } from "@/lib/reports/render";
import { runAsTenant, serviceClient } from "@/lib/supabase/scheduled";

/**
 * Renderiza un informe encargado por `/api/cron/reports`.
 *
 * Una petición, un informe, un tenant: la capa de datos corre dentro de
 * `runAsTenant`, que acota cada consulta al tenant de la fila. Sin eso, un
 * generador sin sesión leería los datos de todos.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const { reportId } = (await request.json()) as { reportId?: string };
  if (!reportId) return NextResponse.json({ error: "falta reportId" }, { status: 400 });

  const supabase = serviceClient();
  const { data: report } = await supabase
    .from("reports")
    .select("id, tenant_id, type, framework_code, period_start, period_end, tenants(slug)")
    .eq("id", reportId)
    .single();

  if (!report) return NextResponse.json({ error: "informe no encontrado" }, { status: 404 });

  const slug = (report.tenants as { slug: string } | null)?.slug;
  if (!slug) return NextResponse.json({ error: "informe sin empresa" }, { status: 500 });

  const ok = await runAsTenant(report.tenant_id, async () => {
    const scoped = serviceClient();
    return renderAndStore(scoped as never, {
      reportId: report.id,
      tenantUuid: report.tenant_id,
      tenantSlug: slug,
      type: report.type as ReportType,
      framework: (report.framework_code ?? undefined) as FrameworkCode | undefined,
      start: report.period_start,
      end: report.period_end,
    });
  });

  return NextResponse.json({ ok });
}
