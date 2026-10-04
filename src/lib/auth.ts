"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession, verifySession } from "./session";

function sessionTtlSeconds(): number {
  const raw = Number(process.env.DASHBOARD_SESSION_TTL_SECONDS ?? "43200");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 43200;
}

function passphraseMatches(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSPHRASE ?? "";
  if (!expected || !input) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const passphrase = String(formData.get("passphrase") ?? "");
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";

  if (!process.env.DASHBOARD_PASSPHRASE || !secret) {
    return { error: "Operator access is not configured (missing env)." };
  }
  if (!passphraseMatches(passphrase)) {
    return { error: "Incorrect passphrase." };
  }

  const exp = Math.floor(Date.now() / 1000) + sessionTtlSeconds();
  const token = await signSession(exp, secret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds(),
  });
  redirect("/dev");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

/** Authoritative check for server code. Redirects to /login when invalid. */
export async function requireOperator(): Promise<number> {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const store = await cookies();
  const exp = await verifySession(store.get(SESSION_COOKIE)?.value, secret);
  if (exp === null) redirect("/login");
  return exp;
}

/** Non-redirecting check for route handlers. */
export async function isOperatorRequest(request: Request): Promise<boolean> {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const header = request.headers.get("cookie") ?? "";
  const token = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return (await verifySession(token, secret)) !== null;
}
