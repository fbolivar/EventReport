import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and the icon. The session has to be
     * refreshed on public pages too, or the navbar would not know who is
     * signed in; who may enter the portal is decided in updateSession.
     */
    "/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
