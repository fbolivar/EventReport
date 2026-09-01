import { NextResponse } from "next/server";
import type { FrameworkCode, ReportType } from "@eventreport/schema";

import { reportReadyMail, sendMail } from "@/lib/email/send";
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

interface ReportRow {
  id: string;
  tenant_id: string;
  type: string;
  framework_code: string | null;
  period_start: string;
  period_end: string;
}

/**
 * Avisa a las personas con acceso a la empresa. Los correos viven en
 * `auth.users`, que no se consulta con SQL: se piden uno por uno por la API de
 * administración, que es la única puerta a esa tabla.
 */
async function notify(
  supabase: ReturnType<typeof serviceClient>,
  report: ReportRow,
  slug: string,
) {
  const { data: members } = await supabase
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", report.tenant_id);

  const emails: string[] = [];
  for (const member of members ?? []) {
    const { data } = await supabase.auth.admin.getUserById(member.user_id);
    if (data.user?.email) emails.push(data.user.email);
  }

  if (emails.length === 0) return { sent: false as const, reason: "sin destinatarios" };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", report.tenant_id)
    .maybeSingle();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return sendMail(
    reportReadyMail({
      tenantName: tenant?.name ?? "tu empresa",
      reportName: REPORT_NAMES[report.type] ?? "Informe",
      period: `${report.period_start.slice(0, 10)} — ${report.period_end.slice(0, 10)}`,
      portalUrl: `${site}/${slug}/reports`,
      to: emails,
    }),
  );
}

const REPORT_NAMES: Record<string, string> = {
  executive: "Informe ejecutivo de postura",
  hardening: "Informe de hardening",
  activity: "Informe de actividad de red",
  changes: "Informe de cambios de configuración",
  compliance: "Informe de cumplimiento",
};

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

  // El aviso sale solo desde aquí, no cuando alguien pulsa "Generar": quien
  // acaba de pedir un informe no necesita un correo diciéndole que lo pidió.
  const mail = ok ? await notify(supabase, report, slug) : { sent: false as const };

  return NextResponse.json({ ok, mail });
}
