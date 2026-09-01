import { NextResponse } from "next/server";
import type { FrameworkCode, PlanCode, ReportType } from "@eventreport/schema";

import { dueReports, type ExistingReport } from "@/lib/reports/schedule";
import { serviceClient } from "@/lib/supabase/scheduled";

/**
 * Despacho de la generación programada (§8, §10).
 *
 * Este endpoint decide **qué** falta y encarga cada informe; no renderiza
 * ninguno. El renderizado va a `/api/cron/render`, una petición por informe,
 * por dos razones:
 *
 * 1. La memoización de la capa de datos (`cache()` de React) vive dentro de una
 *    petición. Si un mismo request recorriera varios tenants, el segundo leería
 *    los datos memoizados del primero: un informe con datos de otro cliente.
 *    Una petición por informe hace imposible esa confusión.
 * 2. Cada PDF tarda hasta un minuto. Repartidos, ninguno se acerca al límite de
 *    duración de una función.
 *
 * Se autentica con un secreto compartido, no con sesión: quien lo llama es el
 * cron de Postgres, no una persona.
 */
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const supabase = serviceClient();
  const now = new Date();

  // Un render que muere —el proceso se cae, la función se queda sin tiempo—
  // deja la fila en `generating` para siempre, y como el despacho la cuenta
  // como hecha, ese informe no se vuelve a intentar nunca. Media hora es más
  // de lo que tarda el más lento, así que lo que siga ahí está muerto.
  const stale = new Date(now.getTime() - 30 * 60_000).toISOString();
  await supabase
    .from("reports")
    .update({ status: "failed" })
    .eq("status", "generating")
    .lt("created_at", stale);

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, slug, plan, tenant_frameworks(framework_code)");

  if (error || !tenants) {
    return NextResponse.json({ error: "no pudimos leer los tenants" }, { status: 500 });
  }

  const base = new URL(request.url).origin;
  const encargados: Array<{ tenant: string; type: ReportType; framework?: string }> = [];

  for (const tenant of tenants) {
    const { data: reports } = await supabase
      .from("reports")
      .select("type, framework_code, period_start")
      .eq("tenant_id", tenant.id)
      .in("status", ["ready", "generating"]);

    const existing: ExistingReport[] = (reports ?? []).map((row) => ({
      type: row.type,
      framework: row.framework_code ?? undefined,
      periodStart: row.period_start,
    }));

    const jobs = dueReports({
      now,
      plan: tenant.plan as PlanCode,
      frameworks: (tenant.tenant_frameworks ?? []).map(
        (row: { framework_code: string }) => row.framework_code as FrameworkCode,
      ),
      existing,
    });

    for (const job of jobs) {
      const { data: row } = await supabase
        .from("reports")
        .insert({
          tenant_id: tenant.id,
          type: job.type,
          framework_code: job.framework ?? null,
          period_start: job.periodStart,
          period_end: job.periodEnd,
          status: "generating",
        })
        .select("id")
        .single();

      if (!row) continue;

      // Sin esperar: cada informe se cocina en su propia petición. Si una falla,
      // su fila queda en `failed` y las demás siguen.
      void fetch(`${base}/api/cron/render`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: request.headers.get("authorization") ?? "",
        },
        body: JSON.stringify({ reportId: row.id }),
      }).catch((cause) => console.error("no se pudo encargar el render", cause));

      encargados.push({ tenant: tenant.slug, type: job.type, framework: job.framework });
    }
  }

  return NextResponse.json({ encargados });
}
