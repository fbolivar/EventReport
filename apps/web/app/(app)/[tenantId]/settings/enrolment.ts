"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getTenant, tenantUuid } from "@/lib/data/tenant";
import { linuxInstaller, windowsInstaller } from "./installer";
import { createClient } from "@/lib/supabase/server";

export interface EnrolmentState {
  error?: string;
  /** El token en claro. Existe solo en esta respuesta y no se vuelve a mostrar. */
  token?: string;
  command?: string;
  /** El instalador, ya con el token dentro: el cliente no copia nada. */
  installer?: { windows: string; linux: string; filename: string };
}

/** Vale 24 horas: suficiente para instalar hoy, inútil si se filtra mañana. */
const TTL_HOURS = 24;

/**
 * Un token legible: cuatro grupos de cuatro, sin caracteres que se confundan al
 * dictarlo por teléfono (sin O/0, sin I/1). Se instala leyéndolo en voz alta
 * más veces de las que uno quisiera.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newToken(): string {
  const bytes = randomBytes(16);
  const chars = [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return chars.match(/.{1,4}/g)!.join("-");
}

const hashOf = (token: string) =>
  createHash("sha256").update(token.trim().toUpperCase().replaceAll("-", "")).digest("hex");

/**
 * Emite un token de enrolamiento para una sede (§6.7).
 *
 * En la base solo queda el hash: quien lea la tabla —incluidos nosotros— no
 * puede enrolar un colector con él. El texto plano se devuelve una vez, se
 * muestra en pantalla y se pierde; si el operador lo extravía, emite otro.
 */
export async function createEnrolmentToken(
  _previous: EnrolmentState,
  formData: FormData,
): Promise<EnrolmentState> {
  const tenantSlug = String(formData.get("tenant") ?? "");
  const siteId = String(formData.get("site") ?? "");
  const label = String(formData.get("label") ?? "").trim();

  if (!tenantSlug || !siteId) return { error: "Elige la sede del colector." };

  const supabase = await createClient();
  const uuid = await tenantUuid(tenantSlug);
  if (!uuid) return { error: "No encontramos esa empresa." };

  const { data: user } = await supabase.auth.getUser();
  const token = newToken();

  const { error } = await supabase.from("collector_enrolments").insert({
    tenant_id: uuid,
    site_id: siteId,
    token_hash: hashOf(token),
    label: label || null,
    created_by: user.user?.id ?? null,
    expires_at: new Date(Date.now() + TTL_HOURS * 3_600_000).toISOString(),
  });

  if (error) return { error: "No pudimos emitir el token. Vuelve a intentarlo." };

  revalidatePath(`/${tenantSlug}/settings`);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const tenant = await getTenant(tenantSlug);
  const downloads = `${base}/storage/v1/object/public/downloads`;
  const input = {
    token,
    supabaseUrl: base,
    tenantName: tenant?.name ?? tenantSlug,
    downloadUrl: "",
  };

  return {
    token,
    // El comando queda para quien prefiera consola; el camino normal es el
    // instalador, que no pide escribir nada.
    command: `collector setup -token ${token} -url ${base}`,
    installer: {
      windows: windowsInstaller({
        ...input,
        downloadUrl: `${downloads}/eventreport-collector-windows-amd64.exe`,
      }),
      linux: linuxInstaller({
        ...input,
        downloadUrl: `${downloads}/eventreport-collector-linux-amd64`,
      }),
      filename: `instalar-eventreport-${tenantSlug}`,
    },
  };
}

/** Revoca un token que todavía no se usó: un token perdido no se deja vivo. */
export async function revokeEnrolmentToken(
  _previous: EnrolmentState,
  formData: FormData,
): Promise<EnrolmentState> {
  const tenantSlug = String(formData.get("tenant") ?? "");
  const id = String(formData.get("enrolment") ?? "");
  if (!tenantSlug || !id) return { error: "Falta el token." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("collector_enrolments")
    .delete()
    .eq("id", id)
    .is("used_at", null);

  if (error) return { error: "No pudimos revocar el token." };

  revalidatePath(`/${tenantSlug}/settings`);
  return {};
}
