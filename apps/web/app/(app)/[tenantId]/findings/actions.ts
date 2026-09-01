"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface DecisionState {
  error?: string;
  ok?: boolean;
}

/**
 * Accepting a risk is a decision the customer makes, and it is audited: it
 * requires a written justification, and the rules engine will not reopen it
 * (see `ingest-config`, which skips findings already marked `accepted`).
 */
export async function acceptRisk(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const findingId = String(formData.get("finding") ?? "");
  const tenantSlug = String(formData.get("tenant") ?? "");
  const justification = String(formData.get("justification") ?? "").trim();

  if (!findingId || !tenantSlug) return { error: "Falta el hallazgo." };
  if (justification.length < 15) {
    return { error: "Escribe por qué se acepta el riesgo: queda en el historial." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("findings")
    .update({ status: "accepted", justification })
    .eq("id", findingId);

  if (error) return { error: "No pudimos guardar la decisión." };

  revalidatePath(`/${tenantSlug}/findings`);
  return { ok: true };
}

/** Reopens an accepted risk: the decision can be undone, and that is audited too. */
export async function reopenFinding(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const findingId = String(formData.get("finding") ?? "");
  const tenantSlug = String(formData.get("tenant") ?? "");
  if (!findingId || !tenantSlug) return { error: "Falta el hallazgo." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("findings")
    .update({ status: "open", justification: null })
    .eq("id", findingId);

  if (error) return { error: "No pudimos reabrir el hallazgo." };

  revalidatePath(`/${tenantSlug}/findings`);
  return { ok: true };
}

/**
 * Marks a critical event as treated. Untreated events past seven days are what
 * OP-002 counts, so this button is not cosmetic: it moves a rule.
 */
export async function acknowledgeEvent(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const eventId = String(formData.get("event") ?? "");
  const tenantSlug = String(formData.get("tenant") ?? "");
  if (!eventId || !tenantSlug) return { error: "Falta el evento." };

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("critical_events")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.user?.id ?? null,
    })
    .eq("id", eventId);

  if (error) return { error: "No pudimos marcar el evento." };

  revalidatePath(`/${tenantSlug}/dashboard`);
  return { ok: true };
}
