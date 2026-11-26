import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RETURN_TO_HEADER } from "@/lib/doc-link";

/**
 * The portal layout cannot see the requested path. For the pages that can be shared as links
 * it is handed over here, so a visitor who is not signed in comes back to it after the login.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(RETURN_TO_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/docs"],
};
