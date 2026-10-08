import { NextResponse } from "next/server";
import { sessionTtlSeconds, setSessionCookie } from "@/lib/auth";
import { isOwnerUser } from "@/lib/owner";
import { isSessionSecretConfigured, signSession } from "@/lib/session";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const initData =
    typeof body === "object" && body !== null && "initData" in body
      ? body.initData
      : null;
  if (typeof initData !== "string" || initData.length === 0) {
    return NextResponse.json(
      { error: "Open this page inside the Kitsu Telegram app to sign in." },
      { status: 400 }
    );
  }

  const botToken = process.env.KITSU_BOT_TOKEN ?? "";
  const sessionSecret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  if (!botToken || !isSessionSecretConfigured(sessionSecret)) {
    return NextResponse.json(
      { error: "Telegram sign-in is not configured on this deployment." },
      { status: 503 }
    );
  }

  const identity = verifyTelegramInitData(initData, botToken);
  if (!identity) {
    return NextResponse.json(
      { error: "Telegram sign-in data is invalid or expired. Reopen Kitsu in Telegram and try again." },
      { status: 401 }
    );
  }

  const ttl = sessionTtlSeconds();
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const token = await signSession(identity.userId, exp, sessionSecret);
  await setSessionCookie(token, ttl);

  return NextResponse.json(
    { authenticated: true, isOwner: isOwnerUser(identity.userId) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
