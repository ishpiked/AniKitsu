"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendBaseUrl } from "@/lib/kitsu/client";
import {
  SESSION_COOKIE,
  signSession,
  type AccountProfile,
  type AccountSession,
} from "@/lib/session";

const SESSION_TTL_SECONDS = 43_200;

interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

type TelegramLoginIdentity = TelegramLoginData | { init_data: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseTelegramLoginData(value: unknown): TelegramLoginData | null {
  const input = asRecord(value);
  if (
    !input ||
    !Number.isSafeInteger(input.id) ||
    Number(input.id) <= 0 ||
    typeof input.first_name !== "string" ||
    !input.first_name.trim() ||
    input.first_name.length > 64 ||
    !Number.isSafeInteger(input.auth_date) ||
    typeof input.hash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(input.hash)
  ) {
    return null;
  }

  const optionalText = (key: string, max: number): string | undefined => {
    const field = input[key];
    if (field === undefined || field === null) return undefined;
    return typeof field === "string" && field.length <= max ? field : undefined;
  };

  return {
    id: Number(input.id),
    first_name: input.first_name,
    last_name: optionalText("last_name", 64),
    username: optionalText("username", 32),
    photo_url: optionalText("photo_url", 2048),
    auth_date: Number(input.auth_date),
    hash: input.hash,
  };
}

function sessionTtlSeconds(): number {
  const raw = Number(process.env.DASHBOARD_SESSION_TTL_SECONDS ?? "43200");
  return Number.isFinite(raw) && raw > 0
    ? Math.min(Math.floor(raw), 30 * 24 * 60 * 60)
    : SESSION_TTL_SECONDS;
}

async function exchangeTelegramLogin(
  identity: TelegramLoginIdentity,
  expectedId: number | null,
) {
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  if (!secret) return { error: "Profile sign in is not configured on this server." };

  let result: Response;
  try {
    const webAppLogin = "init_data" in identity;
    const endpoint = webAppLogin ? "telegram-webapp-login" : "telegram-login";
    result = await fetch(
      `${backendBaseUrl()}/api/account/${endpoint}`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(identity),
      },
    );
  } catch {
    return { error: "Kitsu could not reach the sign in service. Try again shortly." };
  }
  if (!result.ok) {
    return {
      error:
        result.status === 401
          ? "Telegram sign in could not be verified. Please try again."
          : "Telegram sign in is temporarily unavailable.",
    };
  }

  let payload: unknown;
  try {
    payload = await result.json();
  } catch {
    return { error: "The sign in service returned an invalid response." };
  }
  const body = asRecord(payload);
  const profile = asRecord(body?.user);
  if (
    !profile ||
    !Number.isSafeInteger(profile.id) ||
    Number(profile.id) <= 0 ||
    (expectedId !== null && profile.id !== expectedId) ||
    typeof profile.first_name !== "string" ||
    typeof profile.is_owner !== "boolean"
  ) {
    return { error: "The sign in service returned an invalid profile." };
  }
  const personal = asRecord(profile.profile);
  const watchRequests = asRecord(personal?.watch_requests);
  const recentWatches = Array.isArray(personal?.recent_watches)
    ? personal.recent_watches
    : null;
  if (
    !personal ||
    typeof personal.available !== "boolean" ||
    !watchRequests ||
    !recentWatches ||
    recentWatches.length > 4 ||
    !Number.isSafeInteger(personal.watch_seconds) ||
    Number(personal.watch_seconds) < 0 ||
    !Number.isSafeInteger(watchRequests.movies) ||
    !Number.isSafeInteger(watchRequests.series) ||
    !Number.isSafeInteger(watchRequests.total)
  ) {
    return { error: "The sign in service returned invalid account activity." };
  }

  const cleanWatches: AccountProfile["recentWatches"] = [];
  for (const value of recentWatches) {
    const watch = asRecord(value);
    if (
      !watch ||
      typeof watch.title !== "string" ||
      typeof watch.imdb !== "string" ||
      (watch.media_type !== "movie" && watch.media_type !== "series")
    ) {
      return { error: "The sign in service returned invalid watch history." };
    }
    cleanWatches.push({
      title: watch.title.slice(0, 120),
      imdb: watch.imdb.slice(0, 32),
      mediaType: watch.media_type,
      season: Number.isSafeInteger(watch.season) ? Number(watch.season) : null,
      episode: Number.isSafeInteger(watch.episode) ? Number(watch.episode) : null,
      updatedAt: typeof watch.updated_at === "string" ? watch.updated_at : null,
    });
  }

  const personalProfile: AccountProfile = {
    available: personal.available,
    firstSeen: typeof personal.first_seen === "string" ? personal.first_seen : null,
    lastActive: typeof personal.last_active === "string" ? personal.last_active : null,
    watchSeconds: Number(personal.watch_seconds),
    watchRequests: {
      movies: Number(watchRequests.movies),
      series: Number(watchRequests.series),
      total: Number(watchRequests.total),
    },
    recentWatches: cleanWatches,
  };

  const exp = Math.floor(Date.now() / 1000) + sessionTtlSeconds();
  const session: AccountSession = {
    id: Number(profile.id),
    firstName: profile.first_name.slice(0, 64),
    lastName:
      typeof profile.last_name === "string" ? profile.last_name.slice(0, 64) : "",
    username:
      typeof profile.username === "string" ? profile.username.slice(0, 32) : "",
    photoUrl:
      typeof profile.photo_url === "string" && profile.photo_url.startsWith("https://")
        ? profile.photo_url.slice(0, 2048)
        : "",
    isOwner: profile.is_owner,
    profile: personalProfile,
    exp,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(session, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds(),
  });
  redirect(session.isOwner ? "/profile/dashboard" : "/profile");
}

export async function loginWithTelegram(value: unknown) {
  const telegramUser = parseTelegramLoginData(value);
  if (!telegramUser) return { error: "Telegram returned incomplete sign in details." };
  return exchangeTelegramLogin(telegramUser, telegramUser.id);
}

export async function loginWithTelegramWebApp(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 8_192) {
    return { error: "Telegram did not provide valid Web App sign in details." };
  }
  return exchangeTelegramLogin({ init_data: value }, null);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}
