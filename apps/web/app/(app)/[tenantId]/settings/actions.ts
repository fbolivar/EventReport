"use server";

import { revalidatePath } from "next/cache";
import type { MemberRole } from "@eventreport/schema";

import { tenantUuid } from "@/lib/data/tenant";
import { createClient } from "@/lib/supabase/server";

export interface InviteState {
  error?: string;
  ok?: string;
}

/**
 * Invites somebody by email.
 *
 * There is no service_role key involved: the invitation is a row, and a
 * trigger on `auth.users` turns it into a membership when that person signs
 * up. The portal alone is enough to run the flow.
 */
export async function inviteMember(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const tenantSlug = String(formData.get("tenant") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "client_viewer") as MemberRole;

  if (!email.includes("@")) return { error: "Escribe un correo válido." };

  const supabase = await createClient();
  const uuid = await tenantUuid(tenantSlug);
  if (!uuid) return { error: "No encontramos esa empresa." };

  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase.from("tenant_invitations").upsert(
    { tenant_id: uuid, email, role, invited_by: user.user?.id ?? null },
    { onConflict: "tenant_id,email" },
  );

  if (error) return { error: "No pudimos guardar la invitación." };

  revalidatePath(`/${tenantSlug}/settings`);
  return { ok: `Invitación registrada para ${email}. Entrará al crear su cuenta.` };
}
