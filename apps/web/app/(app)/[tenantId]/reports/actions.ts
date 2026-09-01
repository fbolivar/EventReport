"use server";

import { revalidatePath } from "next/cache";

import { buildReportInput } from "@/lib/reports/input";
import { renderExecutiveReport } from "@/lib/reports/pdf";
import { writeSections } from "@/lib/reports/sections";
import { tenantUuid } from "@/lib/data/tenant";
import { createClient } from "@/lib/supabase/server";

export interface GenerateState {
  error?: string;
  ok?: string;
}

/**
 * Generates the executive report: gathers the data, writes the prose, renders
 * the PDF and stores it.
 *
 * The row is created first with status `generating`, so the portal shows the
 * work in progress and a failure leaves a visible trace instead of nothing.
 */
export async function generateExecutiveReport(
  _previous: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const tenantSlug = String(formData.get("tenant") ?? "");
  if (!tenantSlug) return { error: "Falta el identificador de la empresa." };

  const supabase = await createClient();
  const uuid = await tenantUuid(tenantSlug);
  if (!uuid) return { error: "No encontramos esa empresa." };

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86_400_000);

  const { data: row, error: insertError } = await supabase
    .from("reports")
    .insert({
      tenant_id: uuid,
      type: "executive",
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      status: "generating",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return { error: "No pudimos registrar el informe. Vuelve a intentarlo." };
  }

  try {
    const input = await buildReportInput(tenantSlug, start.toISOString(), end.toISOString());
    if (!input) throw new Error("sin datos para el informe");

    const sections = await writeSections(input);
    const pdf = await renderExecutiveReport(input, sections);
    const path = `${uuid}/${row.id}.pdf`;

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
        pages: 2,
        size_kb: Math.round(pdf.byteLength / 1024),
      })
      .eq("id", row.id);

    revalidatePath(`/${tenantSlug}/reports`);
    return {
      ok:
        sections.generatedBy === "claude"
          ? "Informe generado."
          : "Informe generado con redacción en plantilla: falta la clave de Claude.",
    };
  } catch (error) {
    console.error("no se pudo generar el informe", error);
    await supabase.from("reports").update({ status: "failed" }).eq("id", row.id);
    revalidatePath(`/${tenantSlug}/reports`);
    return { error: "No pudimos generar el informe. Quedó registrado como fallido." };
  }
}

/** Short-lived link to download a stored PDF. */
export async function reportDownloadUrl(storagePath: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("reports").createSignedUrl(storagePath, 300);
  return data?.signedUrl;
}
