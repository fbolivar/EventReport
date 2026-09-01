import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Acota un cliente de Supabase a un solo tenant.
 *
 * El generador programado no tiene sesión, así que corre con la clave de
 * servicio, que ignora RLS por completo. Sin este proxy, cualquier consulta de
 * la capa de datos —escrita para un portal donde RLS filtra sola— devolvería
 * las filas de **todos** los clientes, y un informe podría salir con datos de
 * otra empresa.
 *
 * El filtro deja de ser algo que alguien pueda olvidar y pasa a ser parte del
 * cliente. Las tablas de catálogo, que no tienen `tenant_id`, se declaran una
 * por una: la lista es corta y obliga a pensar antes de agregarle nada.
 *
 * Vive separado de `scheduled.ts` —donde está la clave— para poder probarse.
 */
type Client = SupabaseClient<Database>;

const CATALOG_TABLES = new Set([
  "frameworks",
  "controls",
  "finding_rules",
  "rule_controls",
  "rule_remediations",
]);

/** Cliente con el filtro de tenant incorporado. */
export function tenantScoped(client: Client, tenantId: string): Client {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property !== "from") return Reflect.get(target, property, receiver);

      return (table: string) => {
        const builder = target.from(table as never);
        if (CATALOG_TABLES.has(table)) return builder;
        // `tenants` es el tenant: se identifica por `id`, no por `tenant_id`.
        const column = table === "tenants" ? "id" : "tenant_id";
        return new Proxy(builder, {
          get(builderTarget, method, builderReceiver) {
            const value = Reflect.get(builderTarget, method, builderReceiver);
            if (method !== "select" || typeof value !== "function") return value;
            // El filtro se aplica sobre el resultado de `select`, que es donde
            // PostgREST admite condiciones.
            return (...args: unknown[]) =>
              (value as (...a: unknown[]) => { eq: (c: string, v: string) => unknown }).apply(
                builderTarget,
                args,
              ).eq(column, tenantId);
          },
        }) as unknown as typeof builder;
      };
    },
  });
}

