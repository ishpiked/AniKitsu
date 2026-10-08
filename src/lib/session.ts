// Edge-safe signed user sessions (WebCrypto only, no Node APIs).
// Token format: "<user-id>.<exp-unix-seconds>.<base64url-hmac>".

export const SESSION_COOKIE = "kitsu_user";

export interface SessionClaims {
  userId: number;
  exp: number;
}

const encoder = new TextEncoder();

export function isSessionSecretConfigured(secret: string): boolean {
  return /^[a-f0-9]{64}$/i.test(secret);
}

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

async function sessionKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toArrayBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out;
}

function sessionBody(userId: number, exp: number): Uint8Array<ArrayBuffer> {
  return toArrayBuffer(encoder.encode(`kitsu-user:${userId}:${exp}`));
}

export async function signSession(
  userId: number,
  exp: number,
  secret: string
): Promise<string> {
  if (!isSessionSecretConfigured(secret)) {
    throw new Error("DASHBOARD_SESSION_SECRET must be 32 random bytes encoded as hex.");
  }
  const key = await sessionKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    sessionBody(userId, exp)
  );
  return `${userId}.${exp}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Returns the authenticated Telegram user and expiry, or null if invalid. */
export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<SessionClaims | null> {
  if (!token || !isSessionSecretConfigured(secret)) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const userId = Number(parts[0]);
  const exp = Number(parts[1]);
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    !Number.isInteger(exp) ||
    exp <= 0 ||
    exp * 1000 < Date.now()
  ) {
    return null;
  }

  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = toArrayBuffer(base64UrlDecode(parts[2]));
  } catch {
    return null;
  }
  const key = await sessionKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    sessionBody(userId, exp)
  );
  return valid ? { userId, exp } : null;
}
