import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Optimistic gate: bounce unauthenticated browsers to /login and reject
// unauthenticated BFF calls. Authoritative checks also run inside route
// handlers and server code (see src/lib/auth.ts).
export async function proxy(request: NextRequest) {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const exp = await verifySession(token, secret);
  if (exp !== null) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dev/:path*", "/api/kitsu/:path*"],
};
