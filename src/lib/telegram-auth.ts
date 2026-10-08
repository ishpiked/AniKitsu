import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MAX_INIT_DATA_AGE_SECONDS = 15 * 60;
const MAX_FUTURE_SKEW_SECONDS = 60;

export interface TelegramWebAppIdentity {
  userId: number;
  photoUrl?: string;
}

export interface TelegramLoginWidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

function isFreshAuthDate(
  authDate: number,
  now: number,
  maxAgeSeconds = MAX_INIT_DATA_AGE_SECONDS
): boolean {
  const nowSeconds = Math.floor(now / 1000);
  return (
    Number.isSafeInteger(authDate) &&
    authDate > 0 &&
    nowSeconds - authDate <= maxAgeSeconds &&
    authDate - nowSeconds <= MAX_FUTURE_SKEW_SECONDS
  );
}

function telegramPhotoUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Verify Telegram's signed WebApp init data before trusting its user field. */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  now = Date.now(),
  maxAgeSeconds = MAX_INIT_DATA_AGE_SECONDS
): TelegramWebAppIdentity | null {
  if (!initData || initData.length > 16_384 || !botToken) return null;

  const params = new URLSearchParams(initData);
  const allEntries = Array.from(params.entries());
  if (
    params.getAll("hash").length !== 1 ||
    params.getAll("auth_date").length !== 1 ||
    params.getAll("user").length !== 1 ||
    allEntries.length !== new Set(allEntries.map(([key]) => key)).size
  ) {
    return null;
  }

  const suppliedHash = params.get("hash") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(suppliedHash)) return null;
  const dataCheckString = allEntries
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();
  const receivedHash = Buffer.from(suppliedHash, "hex");
  if (
    receivedHash.length !== calculatedHash.length ||
    !timingSafeEqual(receivedHash, calculatedHash)
  ) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!isFreshAuthDate(authDate, now, maxAgeSeconds)) return null;

  let user: unknown;
  try {
    user = JSON.parse(params.get("user") ?? "");
  } catch {
    return null;
  }
  if (typeof user !== "object" || user === null || !("id" in user)) return null;
  const userId = user.id;
  if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0) {
    return null;
  }

  const photoUrl =
    "photo_url" in user ? telegramPhotoUrl(user.photo_url) : undefined;
  return { userId, ...(photoUrl ? { photoUrl } : {}) };
}

/** Verify the signed user object returned by Telegram's browser Login Widget. */
export function verifyTelegramLoginWidgetUser(
  value: unknown,
  botToken: string,
  now = Date.now()
): TelegramWebAppIdentity | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !botToken
  ) {
    return null;
  }

  const user = value as Record<string, unknown>;
  const allowedFields = new Set([
    "id",
    "first_name",
    "last_name",
    "username",
    "photo_url",
    "auth_date",
    "hash",
  ]);
  if (
    Object.keys(user).some((key) => !allowedFields.has(key)) ||
    typeof user.id !== "number" ||
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    typeof user.first_name !== "string" ||
    typeof user.auth_date !== "number" ||
    typeof user.hash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(user.hash) ||
    !isFreshAuthDate(user.auth_date, now)
  ) {
    return null;
  }

  for (const key of ["last_name", "username", "photo_url"] as const) {
    if (user[key] !== undefined && typeof user[key] !== "string") return null;
  }

  const dataCheckString = Object.entries(user)
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0
    )
    .map(([key, fieldValue]) => `${key}=${fieldValue}`)
    .join("\n");
  const calculatedHash = createHmac(
    "sha256",
    createHash("sha256").update(botToken).digest()
  )
    .update(dataCheckString)
    .digest();
  const receivedHash = Buffer.from(user.hash, "hex");

  if (
    receivedHash.length !== calculatedHash.length ||
    !timingSafeEqual(receivedHash, calculatedHash)
  ) {
    return null;
  }

  const photoUrl = telegramPhotoUrl(user.photo_url);
  return { userId: user.id, ...(photoUrl ? { photoUrl } : {}) };
}
