import { timingSafeEqual } from "node:crypto";
import { adminToken } from "@/lib/kitsu/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_HOST = "api.wecollege.net";
const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const ALLOWED_HEADERS = new Set(["accept", "origin", "referer", "user-agent"]);
const ALLOWED_SUBSERVERS = new Set([
  "miami",
  "boise",
  "vegas",
  "reno",
  "dallas",
  "austin",
  "portland",
  "atlanta",
  "phoenix",
  "seattle",
  "oakland",
  "delhi",
]);
const SOURCE_QUERY_KEYS = new Set([
  "title",
  "mediaType",
  "year",
  "episodeId",
  "seasonId",
  "tmdbId",
  "imdbId",
  "enc",
  "seed",
]);

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function authorized(request: Request): boolean {
  const expected = adminToken();
  const authorization = request.headers.get("authorization") ?? "";
  if (!expected || !authorization.startsWith("Bearer ")) return false;

  const supplied = Buffer.from(authorization.slice(7), "utf8");
  const secret = Buffer.from(expected, "utf8");
  return supplied.length === secret.length && timingSafeEqual(supplied, secret);
}

function allowedTarget(rawUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== UPSTREAM_HOST ||
    (url.port !== "" && url.port !== "443") ||
    url.username ||
    url.password ||
    url.hash ||
    url.href.length > 8192
  ) {
    return null;
  }

  if (url.pathname === "/seed") {
    if (
      [...url.searchParams.keys()].some((key) => key !== "mediaId") ||
      url.searchParams.getAll("mediaId").length !== 1 ||
      !url.searchParams.get("mediaId")
    ) {
      return null;
    }
    return url;
  }

  const subserver = /^\/([a-z]+)\/sources$/.exec(url.pathname)?.[1];
  if (!subserver || !ALLOWED_SUBSERVERS.has(subserver)) return null;
  if ([...url.searchParams.keys()].some((key) => !SOURCE_QUERY_KEYS.has(key))) {
    return null;
  }
  if (
    !url.searchParams.get("title")?.trim() ||
    !["movie", "tv"].includes(url.searchParams.get("mediaType") ?? "") ||
    !url.searchParams.get("tmdbId")?.trim() ||
    !url.searchParams.get("seed")?.trim()
  ) {
    return null;
  }
  for (const key of SOURCE_QUERY_KEYS) {
    if (url.searchParams.getAll(key).length > 1) return null;
  }
  if (url.searchParams.get("mediaType") === "tv") {
    if (!url.searchParams.has("seasonId") || !url.searchParams.has("episodeId")) {
      return null;
    }
  }
  for (const value of url.searchParams.values()) {
    if (value.length > 4096) return null;
  }
  return url;
}

function allowedHeaders(value: unknown): Headers | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const headers = new Headers();
  for (const [name, rawValue] of Object.entries(value)) {
    if (
      !ALLOWED_HEADERS.has(name.toLowerCase()) ||
      typeof rawValue !== "string" ||
      rawValue.length > 4096
    ) {
      return null;
    }
    try {
      headers.set(name, rawValue);
    } catch {
      return null;
    }
  }
  return headers;
}

async function readLimited(response: Response): Promise<Uint8Array | null> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return jsonError("Unauthorized.", 401);

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_REQUEST_BYTES) {
    return jsonError("Request is too large.", 413);
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
      return jsonError("Request is too large.", 413);
    }
    payload = JSON.parse(raw);
  } catch {
    return jsonError("Invalid request.", 400);
  }

  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Invalid request.", 400);
  }
  const requestData = payload as Record<string, unknown>;
  const allowedRequestKeys = new Set(["method", "url", "headers", "timeout_ms"]);
  if (Object.keys(requestData).some((key) => !allowedRequestKeys.has(key))) {
    return jsonError("Unsupported request.", 400);
  }
  if (requestData.method !== "GET" || typeof requestData.url !== "string") {
    return jsonError("Unsupported request.", 400);
  }

  const target = allowedTarget(requestData.url);
  const headers = allowedHeaders(requestData.headers);
  if (!target || !headers) return jsonError("Target is not allowed.", 400);

  const requestedTimeout = Number(requestData.timeout_ms);
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(1000, Math.min(Math.floor(requestedTimeout), 55_000))
    : 15_000;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return jsonError("Provider request failed.", 502);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return jsonError("Provider redirect refused.", 502);
  }

  let body: Uint8Array | null;
  try {
    body = await readLimited(upstream);
  } catch {
    return jsonError("Provider response failed.", 502);
  }
  if (!body) return jsonError("Provider response is too large.", 502);

  return new Response(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "X-Kitsu-Upstream-Status": String(upstream.status),
      "X-Kitsu-Upstream-Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
    },
  });
}
