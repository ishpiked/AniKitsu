import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isOwnerUser } from "@/lib/owner";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Optimistic gate: bounce unauthenticated browsers to /login. Operator
// ownership and all BFF access are checked authoritatively in route handlers
// and server code (see src/lib/auth.ts).
export async function proxy(request: NextRequest) {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, secret);
  const { pathname } = request.nextUrl;
  if (session !== null) {
    if (pathname.startsWith("/dev") && !isOwnerUser(session.userId)) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

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
