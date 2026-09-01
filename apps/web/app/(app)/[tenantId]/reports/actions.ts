"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { FrameworkCode, ReportType } from "@eventreport/schema";

import { tenantUuid } from "@/lib/data/tenant";
import { renderAndStore } from "@/lib/reports/render";
import { createClient } from "@/lib/supabase/server";

export interface GenerateState {
  error?: string;
  ok?: string;
}

/** Tipos que el portal sabe generar hoy. Los demás están en el diseño, no en el código. */
const SUPPORTED: ReportType[] = ["executive", "hardening", "compliance", "changes", "activity"];

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
  const framework = formData.get("framework")
    ? (String(formData.get("framework")) as FrameworkCode)
    : undefined;

  if (!tenantSlug) return { error: "Falta el identificador de la empresa." };
  if (!SUPPORTED.includes(type)) return { error: "Ese informe todavía no está disponible." };
  if (type === "compliance" && !framework) return { error: "Elige el marco del informe." };

  const supabase = await createClient();
  const uuid = await tenantUuid(tenantSlug);
  if (!uuid) return { error: "No encontramos esa empresa." };

  const end = new Date();
  // El cumplimiento es trimestral y el resto mensual (§8). Un informe de
  // cumplimiento sobre 30 días no dice nada sobre un sistema de gestión.
  const days = type === "compliance" ? 90 : 30;
  const start = new Date(end.getTime() - days * 86_400_000);

  const { data: row, error: insertError } = await supabase
    .from("reports")
    .insert({
      tenant_id: uuid,
      type,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      framework_code: framework ?? null,
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
      framework,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  });

  revalidatePath(`/${tenantSlug}/reports`);
  return { ok: "Estamos generando el informe. Actualiza en un minuto." };
}

/** Short-lived link to download a stored PDF. */
export async function reportDownloadUrl(storagePath: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("reports").createSignedUrl(storagePath, 300);
  return data?.signedUrl;
}
