import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type AccountSession } from "./session";

export async function currentAccount(): Promise<AccountSession | null> {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, secret);
}

export async function requireAccount(): Promise<AccountSession> {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return account;
}

export async function requireOwner(): Promise<AccountSession> {
  const account = await requireAccount();
  if (!account.isOwner) redirect("/profile");
  return account;
}

export async function isOwnerRequest(request: Request): Promise<boolean> {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return (await verifySession(token, secret))?.isOwner === true;
}
