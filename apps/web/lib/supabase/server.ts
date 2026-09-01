import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { scheduledClient } from "@/lib/supabase/scheduled";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase client for server components and route handlers.
 *
 * Uses the publishable key, so every query is subject to RLS: the portal can
 * only ever read what `is_tenant_member()` allows for the signed-in user. The
 * service_role key never touches this process; it belongs to Edge Functions.
 */
export async function createClient() {
  // La generación programada no tiene cookies ni sesión: cuando corre, entrega
  // su propio cliente, acotado al tenant que está procesando (ver `scheduled`).
  const scheduled = scheduledClient();
  if (scheduled) return scheduled;

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a server component: the middleware refreshes the
            // session instead, so ignoring this is the documented behaviour.
          }
        },
      },
    },
  );
}
