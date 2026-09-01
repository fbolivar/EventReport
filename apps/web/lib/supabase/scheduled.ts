import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { tenantScoped } from "@/lib/supabase/tenant-scope";
import type { Database } from "@/lib/supabase/types";

/**
 * Acceso para el generador programado de informes.
 *
 * El problema: la generación automática no tiene usuario. El portal se apoya en
 * RLS para separar clientes, y sin sesión no hay RLS que aplicar. La clave de
 * servicio la salta entera, así que usarla tal cual convertiría cualquier
 * consulta del generador en una consulta a **todos** los tenants.
 *
 * La solución vive en `tenant-scope`: un proxy que añade el filtro de tenant a
 * cada consulta. Aquí queda solo lo que toca la clave.
 *
 * Esta es la única parte del portal que ve la clave de servicio, corre solo en
 * el servidor (`server-only`) y jamás lleva prefijo `NEXT_PUBLIC_`.
 */
type Client = SupabaseClient<Database>;

/** Cliente con la clave de servicio. Nunca se usa sin acotar a un tenant. */
export function serviceClient(): Client {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY: la generación programada no puede leer sin ella.",
    );
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface ScheduledContext {
  client: Client;
  tenantId: string;
}

const storage = new AsyncLocalStorage<ScheduledContext>();

/** Cliente programado activo, si lo hay. `createClient()` lo consulta primero. */
export function scheduledClient(): Client | undefined {
  return storage.getStore()?.client;
}

/**
 * Corre `work` como si fuera el tenant indicado: toda la capa de datos —la
 * misma que usa el portal— queda acotada a él sin tocar una sola consulta.
 */
export async function runAsTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  const client = tenantScoped(serviceClient(), tenantId);
  return storage.run({ client, tenantId }, work);
}
