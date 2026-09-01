"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { ReportType } from "@eventreport/schema";

import { tenantUuid } from "@/lib/data/tenant";
import { buildHardeningInput } from "@/lib/reports/hardening";
import { buildReportInput } from "@/lib/reports/input";
import { renderExecutiveReport } from "@/lib/reports/pdf";
import { renderHardeningReport } from "@/lib/reports/pdf-hardening";
import { writeSections } from "@/lib/reports/sections";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface GenerateState {
  error?: string;
  ok?: string;
}

/** Tipos que el portal sabe generar hoy. Los demás están en el diseño, no en el código. */
const SUPPORTED: ReportType[] = ["executive", "hardening"];

/**
 * Pide un informe.
 *
 * La acción **no** espera a que el PDF esté listo: inserta la fila en
 * `generating`, responde, y el trabajo pesado sigue en `after()`. Redactar con
 * el modelo tarda cerca de un minuto, y un botón bloqueado un minuto se siente
 * roto; además, en Vercel una acción que espera tanto se acerca al límite de
 * duración de la función.
 *
 * El precio de esto es que el usuario ve "Generando…" y tiene que volver: por
 * eso la fila existe desde el primer instante, con su estado a la vista.
 */
export async function requestReport(
  _previous: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const tenantSlug = String(formData.get("tenant") ?? "");
  const type = String(formData.get("type") ?? "executive") as ReportType;

  if (!tenantSlug) return { error: "Falta el identificador de la empresa." };
  if (!SUPPORTED.includes(type)) return { error: "Ese informe todavía no está disponible." };

  const supabase = await createClient();
  const uuid = await tenantUuid(tenantSlug);
  if (!uuid) return { error: "No encontramos esa empresa." };

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86_400_000);

  const { data: row, error: insertError } = await supabase
    .from("reports")
    .insert({
      tenant_id: uuid,
      type,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      status: "generating",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return { error: "No pudimos registrar el informe. Vuelve a intentarlo." };
  }

  after(async () => {
    await renderAndStore(supabase, {
      reportId: row.id,
      tenantUuid: uuid,
      tenantSlug,
      type,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  });

  revalidatePath(`/${tenantSlug}/reports`);
  return { ok: "Estamos generando el informe. Actualiza en un minuto." };
}

interface RenderJob {
  reportId: string;
  tenantUuid: string;
  tenantSlug: string;
  type: ReportType;
  start: string;
  end: string;
}

/**
 * Arma, renderiza y guarda el PDF. Corre después de la respuesta, así que
 * nadie está mirando: cualquier fallo tiene que quedar escrito en la fila, o el
 * informe se queda en "Generando…" para siempre.
 */
async function renderAndStore(supabase: SupabaseClient, job: RenderJob): Promise<void> {
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
  } catch (error) {
    console.error("no se pudo generar el informe", error);
    await supabase.from("reports").update({ status: "failed" }).eq("id", job.reportId);
  }

  revalidatePath(`/${job.tenantSlug}/reports`);
}

async function render(job: RenderJob): Promise<{ pdf: Buffer; pages: number }> {
  if (job.type === "hardening") {
    const input = await buildHardeningInput(job.tenantSlug, job.start, job.end);
    if (!input) throw new Error("sin datos para el informe de hardening");
    return { pdf: await renderHardeningReport(input), pages: 1 + Math.ceil(input.items.length / 4) };
  }

  const input = await buildReportInput(job.tenantSlug, job.start, job.end);
  if (!input) throw new Error("sin datos para el informe ejecutivo");
  const sections = await writeSections(input);
  return { pdf: await renderExecutiveReport(input, sections), pages: 2 };
}

/** Short-lived link to download a stored PDF. */
export async function reportDownloadUrl(storagePath: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("reports").createSignedUrl(storagePath, 300);
  return data?.signedUrl;
}
