// Edge safe signed profile sessions created only after backend Telegram verification.

export const SESSION_COOKIE = "kitsu_profile";

export interface AccountWatch {
  title: string;
  imdb: string;
  mediaType: "movie" | "series";
  season: number | null;
  episode: number | null;
  updatedAt: string | null;
}

export interface AccountProfile {
  available: boolean;
  firstSeen: string | null;
  lastActive: string | null;
  watchSeconds: number;
  watchRequests: { movies: number; series: number; total: number };
  recentWatches: AccountWatch[];
}

export interface AccountSession {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photoUrl: string;
  isOwner: boolean;
  profile: AccountProfile;
  exp: number;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 =
    value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function copyToArrayBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

async function sessionKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function validSession(value: unknown): value is AccountSession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const user = value as Partial<AccountSession>;
  const profile = user.profile;
  if (!profile || typeof profile !== "object") return false;
  const requests = profile.watchRequests;
  if (
    !requests ||
    typeof profile.available !== "boolean" ||
    !Number.isSafeInteger(requests.movies) ||
    !Number.isSafeInteger(requests.series) ||
    !Number.isSafeInteger(requests.total) ||
    !Number.isSafeInteger(profile.watchSeconds) ||
    !Array.isArray(profile.recentWatches) ||
    profile.recentWatches.length > 4 ||
    (profile.firstSeen !== null && typeof profile.firstSeen !== "string") ||
    (profile.lastActive !== null && typeof profile.lastActive !== "string")
  ) {
    return false;
  }
  for (const watch of profile.recentWatches) {
    if (
      !watch ||
      typeof watch.title !== "string" ||
      watch.title.length > 120 ||
      typeof watch.imdb !== "string" ||
      watch.imdb.length > 32 ||
      (watch.mediaType !== "movie" && watch.mediaType !== "series") ||
      (watch.season !== null && !Number.isSafeInteger(watch.season)) ||
      (watch.episode !== null && !Number.isSafeInteger(watch.episode)) ||
      (watch.updatedAt !== null && typeof watch.updatedAt !== "string")
    ) {
      return false;
    }
  }
  return (
    Number.isSafeInteger(user.id) &&
    Number(user.id) > 0 &&
    typeof user.firstName === "string" &&
    user.firstName.length <= 64 &&
    typeof user.lastName === "string" &&
    user.lastName.length <= 64 &&
    typeof user.username === "string" &&
    user.username.length <= 32 &&
    typeof user.photoUrl === "string" &&
    user.photoUrl.length <= 2048 &&
    typeof user.isOwner === "boolean" &&
    Number.isSafeInteger(user.exp) &&
    Number(user.exp) > 0
  );
}

export async function signSession(
  session: AccountSession,
  secret: string
): Promise<string> {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(session)));
  const signedValue = `kitsu-profile:${payload}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await sessionKey(secret),
    encoder.encode(signedValue)
  );
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Return verified Telegram identity claims, or null when the session is invalid. */
export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<AccountSession | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || token.indexOf(".", dot + 1) !== -1) return null;

  const payload = token.slice(0, dot);
  let signature: Uint8Array<ArrayBuffer>;
  let session: unknown;
  try {
    signature = copyToArrayBuffer(base64UrlDecode(token.slice(dot + 1)));
    session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
  if (!validSession(session) || session.exp * 1000 <= Date.now()) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await sessionKey(secret),
      signature,
      encoder.encode(`kitsu-profile:${payload}`)
    );
    return valid ? session : null;
  } catch {
    return null;
  }
}
