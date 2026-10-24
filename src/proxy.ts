import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Optimistic account and owner gates. Route layouts and handlers also check
// the signed session before returning protected data.
export async function proxy(request: NextRequest) {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const account = await verifySession(token, secret);
  const { pathname } = request.nextUrl;

  if (pathname === "/dev" || pathname.startsWith("/dev/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/dev(?=\/|$)/, "/profile/dashboard");
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/api/kitsu/") && !account?.isOwner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (pathname.startsWith("/profile/dashboard")) {
    if (!account) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (!account.isOwner) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dev/:path*", "/profile/dashboard/:path*", "/api/kitsu/:path*"],
};
