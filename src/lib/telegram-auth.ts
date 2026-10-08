import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_INIT_DATA_AGE_SECONDS = 15 * 60;
const MAX_FUTURE_SKEW_SECONDS = 60;

export interface TelegramWebAppIdentity {
  userId: number;
}

/** Verify Telegram's signed WebApp init data before trusting its user field. */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  now = Date.now()
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
  const nowSeconds = Math.floor(now / 1000);
  if (
    !Number.isSafeInteger(authDate) ||
    authDate <= 0 ||
    nowSeconds - authDate > MAX_INIT_DATA_AGE_SECONDS ||
    authDate - nowSeconds > MAX_FUTURE_SKEW_SECONDS
  ) {
    return null;
  }

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

  return { userId };
}
