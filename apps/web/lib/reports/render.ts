import { revalidatePath } from "next/cache";
import type { FrameworkCode, ReportType } from "@eventreport/schema";

import { buildChangesInput } from "@/lib/reports/changes";
import { buildComplianceInput } from "@/lib/reports/compliance";
import { buildHardeningInput } from "@/lib/reports/hardening";
import { buildReportInput } from "@/lib/reports/input";
import { renderExecutiveReport } from "@/lib/reports/pdf";
import { renderChangesReport } from "@/lib/reports/pdf-changes";
import { renderComplianceReport } from "@/lib/reports/pdf-compliance";
import { renderHardeningReport } from "@/lib/reports/pdf-hardening";
import { writeSections } from "@/lib/reports/sections";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Renderizado de un informe, en un solo lugar.
 *
 * Lo usan la acción del portal y el generador programado. Son dos caminos muy
 * distintos —uno tiene sesión y el otro no— y lo único que comparten es esto;
 * si se duplicara, el informe automático y el manual empezarían a diferir sin
 * que nadie lo note.
 */
export interface RenderJob {
  reportId: string;
  tenantUuid: string;
  tenantSlug: string;
  type: ReportType;
  framework?: FrameworkCode;
  start: string;
  end: string;
}

/**
 * Arma, renderiza y guarda el PDF. Corre sin nadie mirando —después de la
 * respuesta, o de madrugada—, así que cualquier fallo tiene que quedar escrito
 * en la fila; si no, el informe se queda en "Generando…" para siempre.
 */
export async function renderAndStore(supabase: SupabaseClient, job: RenderJob): Promise<boolean> {
  try {
    const { pdf, pages } = await render(job);
    const path = `${job.tenantUuid}/${job.reportId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw uploadError;

    await supabase
      .from("reports")
      .update({
        status: "ready",
        generated_at: new Date().toISOString(),
        storage_path: path,
        pages,
        size_kb: Math.round(pdf.byteLength / 1024),
      })
      .eq("id", job.reportId);

    revalidatePath(`/${job.tenantSlug}/reports`);
    return true;
  } catch (error) {
    console.error("no se pudo generar el informe", error);
    await supabase.from("reports").update({ status: "failed" }).eq("id", job.reportId);
    revalidatePath(`/${job.tenantSlug}/reports`);
    return false;
  }
}

async function render(job: RenderJob): Promise<{ pdf: Buffer; pages: number }> {
  if (job.type === "hardening") {
    const input = await buildHardeningInput(job.tenantSlug, job.start, job.end);
    if (!input) throw new Error("sin datos para el informe de hardening");
    return { pdf: await renderHardeningReport(input), pages: 1 + Math.ceil(input.items.length / 4) };
  }

  if (job.type === "changes") {
    const input = await buildChangesInput(job.tenantSlug, job.start, job.end);
    if (!input) throw new Error("sin datos para el informe de cambios");
    return { pdf: await renderChangesReport(input), pages: 1 + Math.ceil(input.lines.length / 6) };
  }

  if (job.type === "compliance" && job.framework) {
    const input = await buildComplianceInput(job.tenantSlug, job.framework, job.start, job.end);
    if (!input) throw new Error("sin datos para el informe de cumplimiento");
    return {
      pdf: await renderComplianceReport(input),
      pages: 1 + Math.ceil(input.controls.length / 5),
    };
  }

  const input = await buildReportInput(job.tenantSlug, job.start, job.end);
  if (!input) throw new Error("sin datos para el informe ejecutivo");
  const sections = await writeSections(input);
  return { pdf: await renderExecutiveReport(input, sections), pages: 2 };
}
