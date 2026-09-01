import { json, type CollectorContext } from "./collector-auth.ts";

/**
 * Comprueba que el firewall del cuerpo pertenece al tenant del colector que
 * firmó (§6.7).
 *
 * Lo usan todas las funciones de ingesta. Vive aquí y no copiado en cada una
 * porque es la comprobación que **nunca** se puede olvidar: sin ella, un
 * colector con credenciales válidas podría escribir tráfico, eventos o
 * evidencia en los datos de otra empresa con solo cambiar un identificador en
 * el cuerpo de la petición.
 */
export async function firewallOfCollector(
  context: CollectorContext,
  firewallId: unknown,
): Promise<{ id: string } | Response> {
  if (typeof firewallId !== "string" || firewallId.length < 10) {
    return json({ error: "invalid firewall id" }, 400);
  }

  const { data } = await context.admin
    .from("firewalls")
    .select("id")
    .eq("id", firewallId)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();

  if (!data) return json({ error: "unknown firewall for this collector" }, 403);
  return { id: data.id };
}

export const isResponse = (value: unknown): value is Response => value instanceof Response;
