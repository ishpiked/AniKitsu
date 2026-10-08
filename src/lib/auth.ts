import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isOwnerUser } from "./owner";
import { SESSION_COOKIE, verifySession, type SessionClaims } from "./session";

export function sessionTtlSeconds(): number {
  const raw = Number(process.env.DASHBOARD_SESSION_TTL_SECONDS ?? "43200");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 43200;
}

export async function getRequestSession(
  request: Request
): Promise<SessionClaims | null> {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return verifySession(cookie, secret);
}

export async function getCurrentSession() {
  const store = await cookies();
  return verifySession(
    store.get(SESSION_COOKIE)?.value,
    process.env.DASHBOARD_SESSION_SECRET ?? ""
  );
}

export async function logoutAction(): Promise<void> {
  "use server";
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

/** Authoritative owner check for server-rendered operator pages. */
export async function requireOperator(): Promise<number> {
  const session = await getCurrentSession();
  if (session === null) redirect("/login?next=%2Fdev");
  if (!isOwnerUser(session.userId)) redirect("/profile");
  return session.userId;
}

export async function setSessionCookie(
  token: string,
  maxAge: number
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}
