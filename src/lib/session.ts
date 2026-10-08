// Edge-safe operator session tokens (WebCrypto only, no Node APIs).
// Token format: "<exp-unix-seconds>.<base64url-hmac>".
// INTERIM AUTH: a single shared passphrase gate until a real identity
// provider + /api/admin/v1 backend exists (spec §7). Do not treat this as
// production-grade access control.

export const SESSION_COOKIE = "kitsu_ops";

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

function sessionBody(exp: number): Uint8Array<ArrayBuffer> {
  return toArrayBuffer(encoder.encode(`kitsu-ops:${exp}`));
}

export async function signSession(exp: number, secret: string): Promise<string> {
  const key = await sessionKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, sessionBody(exp));
  return `${exp}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Returns the token expiry (unix seconds) when valid, otherwise null. */
export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<number | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const exp = Number(token.slice(0, dot));
  if (!Number.isInteger(exp) || exp <= 0) return null;
  if (exp * 1000 < Date.now()) return null;
  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = toArrayBuffer(base64UrlDecode(token.slice(dot + 1)));
  } catch {
    return null;
  }
  const key = await sessionKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, signature, sessionBody(exp));
  return valid ? exp : null;
}
