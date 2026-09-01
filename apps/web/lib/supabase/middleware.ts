import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/types";

/**
 * Refreshes the session cookie on every request and decides who may enter the
 * portal. Nothing here trusts the URL: `getUser()` revalidates the token
 * against Supabase, and the tenant itself is guarded by RLS on every query.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // La empresa que pide la URL viaja en un encabezado para que la capa de
  // datos pueda acotar cada consulta a ella. RLS decide **quién** puede ver;
  // esto decide **qué** está mirando ahora. Sin ello, un usuario con acceso a
  // varias empresas —un MSSP— ve en /acme datos de todos sus clientes.
  const segment = pathname.split("/")[1] ?? "";
  const reserved = new Set(["", "login", "mssp", "api", "styleguide", "_next", "icon.svg"]);
  if (!reserved.has(segment)) {
    request.headers.set("x-tenant-slug", segment);
    response = NextResponse.next({ request });
  }
  const isAuthRoute = pathname.startsWith("/login");
  // El cron no es una persona: se autentica con un secreto compartido dentro de
  // la propia ruta, y mandarlo a /login solo lo dejaría sin poder trabajar.
  const isCron = pathname.startsWith("/api/cron");
  // La landing y la guía de estilo son públicas; el portal no.
  const isPublic =
    pathname === "/" || pathname.startsWith("/styleguide") || isAuthRoute || isCron;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // So the user lands where they were going once they sign in.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
