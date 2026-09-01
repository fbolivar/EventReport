"use server";

import { revalidatePath } from "next/cache";
import type { FrameworkCode } from "@eventreport/schema";

import { tenantUuid } from "@/lib/data/tenant";
import { createClient } from "@/lib/supabase/server";

export interface ScopeState {
  error?: string;
  ok?: boolean;
}

/**
 * Declaring a control out of scope (§15.5).
 *
 * It requires a written justification and records who wrote it. The database
 * enforces the first half — `compliance_not_applicable_needs_reason` — so a
 * control cannot end up out of scope without a reason even if a future caller
 * forgets to ask for one.
 */
export async function markNotApplicable(
  _previous: ScopeState,
  formData: FormData,
): Promise<ScopeState> {
  const tenantSlug = String(formData.get("tenant") ?? "");
  const framework = String(formData.get("framework") ?? "") as FrameworkCode;
  const control = String(formData.get("control") ?? "");
  const justification = String(formData.get("justification") ?? "").trim();

  if (!tenantSlug || !framework || !control) return { error: "Falta el control." };
  if (justification.length < 15) {
    return { error: "El auditor va a leer esta justificación: escríbela completa." };
  }

  const supabase = await createClient();
  const uuid = await tenantUuid(tenantSlug);
  if (!uuid) return { error: "No encontramos esa empresa." };

  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase.from("compliance_assessments").upsert(
    {
      tenant_id: uuid,
      firewall_id: null,
      framework_code: framework,
      control_code: control,
      status: "not_applicable",
      evidence_finding_ids: [],
      justification,
      justified_by: user.user?.id ?? null,
      assessed_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,firewall_id,framework_code,control_code" },
  );

  if (error) return { error: "No pudimos guardar la justificación." };

  revalidatePath(`/${tenantSlug}/compliance`);
  return { ok: true };
}

/** Puts a control back in scope: it returns to being derived from the findings. */
export async function clearNotApplicable(
  _previous: ScopeState,
  formData: FormData,
): Promise<ScopeState> {
  const tenantSlug = String(formData.get("tenant") ?? "");
  const framework = String(formData.get("framework") ?? "") as FrameworkCode;
  const control = String(formData.get("control") ?? "");
  if (!tenantSlug || !framework || !control) return { error: "Falta el control." };

  const supabase = await createClient();
  const uuid = await tenantUuid(tenantSlug);
  if (!uuid) return { error: "No encontramos esa empresa." };

  const { error } = await supabase
    .from("compliance_assessments")
    .delete()
    .eq("tenant_id", uuid)
    .eq("framework_code", framework)
    .eq("control_code", control)
    .eq("status", "not_applicable");

  if (error) return { error: "No pudimos devolver el control al alcance." };

  revalidatePath(`/${tenantSlug}/compliance`);
  return { ok: true };
}
