import { NextResponse } from "next/server";
import { isOperatorRequest } from "@/lib/auth";
import {
  BACKEND_TIMEOUT_MS,
  adminToken,
  backendBaseUrl,
  clampHours,
  clampInt,
  parseBucket,
  parseWindow,
  parsePrometheus,
  shapeMonitoringResponse,
} from "@/lib/kitsu/client";

export const dynamic = "force-dynamic";

// Narrow allowlist of read-only backend endpoints the dashboard may call.
// The browser never talks to the backend directly and can only reach these
// paths with a valid operator session.
const ALLOWED: Record<string, { upstream: string; type: "json" | "metrics" }> = {
  health: { upstream: "/health", type: "json" },
  "api/monitoring": { upstream: "/api/monitoring", type: "json" },
  "api/monitoring/history": { upstream: "/api/monitoring/history", type: "json" },
  "api/servers": { upstream: "/api/servers", type: "json" },
  metrics: { upstream: "/metrics", type: "metrics" },
};

const ADMIN_ANALYTICS = new Set(["audience", "watch-time", "alerts"]);

// Tiny process-local cache so 45s polling across panels doesn't hammer the
// backend. Per-instance only: do not treat as shared/fleet state.
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { at: number; body: string }>();

function cacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.body;
}

function cacheSet(key: string, body: string): void {
  if (cache.size > 50) cache.clear();
  cache.set(key, { at: Date.now(), body });
}

function cached(body: string, hit: boolean): NextResponse {
  return NextResponse.json(JSON.parse(body), {
    headers: {
      "x-kitsu-cache": hit ? "HIT" : "MISS",
      "Cache-Control": "private, max-age=10",
    },
  });
}

type AdminErrorCode =
  | "not-configured"
  | "bad-request"
  | "unreachable"
  | "forbidden"
  | "upstream";

function adminError(
  error: string,
  code: AdminErrorCode,
  status: number
): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

/**
 * Proxy a read-only /api/admin/v1 route with the server-side owner bearer
 * token. The token never leaves the server; the browser only ever sees the
 * sanitized JSON response (or a typed error with a `code`).
 */
async function proxyAdmin(upstreamPath: string): Promise<NextResponse> {
  const token = adminToken();
  if (!token) {
    return adminError(
      "Admin API is not configured: set KITSU_OWNER_API_TOKEN server-side.",
      "not-configured",
      503
    );
  }

  const cacheKey = `GET ${upstreamPath}`;
  const cachedBody = cacheGet(cacheKey);
  if (cachedBody !== null) return cached(cachedBody, true);

  let res: Response;
  try {
    res = await fetch(`${backendBaseUrl()}${upstreamPath}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return adminError("Backend unreachable.", "unreachable", 502);
  }

  if (res.status === 401 || res.status === 403) {
    return adminError(
      "Backend refused the admin credential. Check KITSU_OWNER_API_TOKEN.",
      "forbidden",
      502
    );
  }
  if (res.status === 400 || res.status === 422) {
    return adminError(
      "Backend rejected the request parameters.",
      "bad-request",
      502
    );
  }
  if (!res.ok) {
    return adminError(
      `Backend responded ${res.status}.`,
      "upstream",
      502
    );
  }

  const serialized = JSON.stringify(await res.json());
  cacheSet(cacheKey, serialized);
  return cached(serialized, false);
}

async function proxyOwnerData(upstreamPath: string): Promise<NextResponse> {
  const token = adminToken();
  if (!token) {
    return adminError(
      "Owner API is not configured: set KITSU_OWNER_API_TOKEN server-side.",
      "not-configured",
      503
    );
  }
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${upstreamPath}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return adminError("Backend unreachable.", "unreachable", 502);
  }
  if (response.status === 401 || response.status === 403) {
    return adminError("Backend refused the owner credential.", "forbidden", 502);
  }
  if (response.status === 400 || response.status === 422) {
    return adminError("Backend rejected the request parameters.", "bad-request", 502);
  }
  if (!response.ok) {
    return adminError(`Backend responded ${response.status}.`, "upstream", 502);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return adminError("Backend returned invalid owner data.", "upstream", 502);
  }
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

function integerParam(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number
): number | null {
  const raw = params.get(name);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : null;
}

function signedId(raw: string | null): number | null {
  if (raw === null || !/^-?\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function ownerQuery(
  params: URLSearchParams,
  defaults: Record<string, number>,
  bounds: Record<string, [number, number]>,
  strings: Record<string, Set<string>> = {}
): URLSearchParams | null {
  const query = new URLSearchParams();
  for (const [name, fallback] of Object.entries(defaults)) {
    const value = integerParam(
      params,
      name,
      fallback,
      bounds[name][0],
      bounds[name][1]
    );
    if (value === null) return null;
    query.set(name, String(value));
  }
  for (const [name, allowed] of Object.entries(strings)) {
    const value = params.get(name);
    if (value !== null) {
      if (!allowed.has(value)) return null;
      query.set(name, value);
    }
  }
  return query;
}

function ownerDataRoute(
  key: string,
  params: URLSearchParams
): string | null | undefined {
  const users = ownerQuery(
    params,
    { limit: 50, offset: 0 },
    { limit: [1, 200], offset: [0, 100_000] },
    { status: new Set(["all", "active", "inactive", "banned", "donor"]) }
  );
  if (key === "api/owner/users") {
    if (!users) return null;
    const search = params.get("q");
    if (search !== null && search.length > 100) return null;
    if (search?.trim()) users.set("q", search.trim());
    return `/api/owner/users?${users}`;
  }
  const userDetail = key.match(/^api\/owner\/users\/(\d{1,16})$/);
  if (userDetail) {
    const userId = signedId(userDetail[1]);
    const query = ownerQuery(
      params,
      { activity_limit: 20, watch_limit: 20 },
      { activity_limit: [1, 100], watch_limit: [1, 100] }
    );
    return userId !== null && userId > 0 && query
      ? `/api/owner/users/${userId}?${query}`
      : null;
  }
  if (key === "api/owner/groups") {
    const query = ownerQuery(
      params,
      { limit: 50, offset: 0 },
      { limit: [1, 200], offset: [0, 100_000] },
      { status: new Set(["all", "active", "removed"]) }
    );
    return query ? `/api/owner/groups?${query}` : null;
  }
  const groupDetail = key.match(/^api\/owner\/groups\/(-?\d{1,16})$/);
  if (groupDetail) {
    const chatId = signedId(groupDetail[1]);
    const query = ownerQuery(
      params,
      { activity_limit: 30 },
      { activity_limit: [1, 100] }
    );
    return chatId !== null && query
      ? `/api/owner/groups/${chatId}?${query}`
      : null;
  }
  return undefined;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const key = (path ?? []).join("/");
  const url = new URL(request.url);
  const params = url.searchParams;

  if (!(await isOperatorRequest(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ownerRoute = ownerDataRoute(key, params);
  if (ownerRoute !== undefined) {
    return ownerRoute
      ? proxyOwnerData(ownerRoute)
      : adminError("Invalid owner data request parameters.", "bad-request", 400);
  }

  // --- Admin namespace (bearer-protected, read-only) ---
  if (key === "api/admin/overview") {
    return proxyAdmin("/api/admin/v1/overview");
  }
  if (key.startsWith("api/admin/analytics/")) {
    const kind = key.slice("api/admin/analytics/".length);
    if (!ADMIN_ANALYTICS.has(kind)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const bucket = parseBucket(params.get("bucket"));
    const window = parseWindow(params.get("from"), params.get("to"));
    if (!bucket || !window) {
      return adminError(
        "Need bucket=day|week|month and a valid RFC 3339 from/to window (max 366 days).",
        "bad-request",
        400
      );
    }
    const query = new URLSearchParams({
      from: window.from,
      to: window.to,
      bucket,
    });
    return proxyAdmin(`/api/admin/v1/analytics/${kind}?${query}`);
  }
  if (key.startsWith("api/admin/rooms")) {
    const limit = clampInt(params.get("limit"), 1, 200, 20);
    const offset = clampInt(params.get("offset"), 0, 10000, 0);
    return proxyAdmin(`/api/admin/v1/rooms?limit=${limit}&offset=${offset}`);
  }

  // --- Public monitoring namespace (no backend auth) ---
  const route = ALLOWED[key];
  if (!route) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let upstreamPath = route.upstream;
  if (key.startsWith("api/monitoring")) {
    upstreamPath += `?hours=${clampHours(url.searchParams.get("hours"))}`;
  }
  const cacheKey = `GET ${upstreamPath}`;

  const cachedBody = cacheGet(cacheKey);
  if (cachedBody !== null) return cached(cachedBody, true);

  let res: Response;
  try {
    res = await fetch(`${backendBaseUrl()}${upstreamPath}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "backend unreachable", path: upstreamPath },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `backend responded ${res.status}`, path: upstreamPath },
      { status: 502 }
    );
  }

  let body: unknown;
  if (route.type === "metrics") {
    // Parse Prometheus exposition server-side so the browser receives a
    // small typed JSON payload instead of raw operational text.
    const text = await res.text();
    body = { ...parsePrometheus(text), scrapedAt: new Date().toISOString() };
  } else if (key === "api/monitoring") {
    body = shapeMonitoringResponse(await res.json());
  } else {
    body = await res.json();
  }

  const serialized = JSON.stringify(body);
  cacheSet(cacheKey, serialized);
  return cached(serialized, false);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const key = (path ?? []).join("/");
  if (key !== "api/owner/blog/images") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await isOperatorRequest(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png|gif|webp)$/i.test(contentType)) {
    return adminError(
      "Upload a JPEG, PNG, GIF, or WebP image.",
      "bad-request",
      415
    );
  }
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const reader = request.body?.getReader();
  if (!reader) {
    return adminError("The image body is empty.", "bad-request", 400);
  }
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > 5 * 1024 * 1024) {
      await reader.cancel();
      return adminError(
        "Blog images must be between 1 byte and 5 MiB.",
        "bad-request",
        413
      );
    }
    chunks.push(value);
  }
  if (byteLength === 0) {
    return adminError(
      "The image body is empty.",
      "bad-request",
      400
    );
  }
  const imageData = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    imageData.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const token = adminToken();
  if (!token) {
    return adminError(
      "Owner API is not configured: set KITSU_OWNER_API_TOKEN server-side.",
      "not-configured",
      503
    );
  }
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}/api/owner/blog/images`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "content-type": contentType,
      },
      body: imageData,
    });
  } catch {
    return adminError("Backend unreachable.", "unreachable", 502);
  }
  if (!response.ok) {
    return adminError(
      response.status === 413 || response.status === 415
        ? "Backend rejected the image upload."
        : `Backend responded ${response.status}.`,
      response.status === 413 || response.status === 415
        ? "bad-request"
        : "upstream",
      response.status === 413 || response.status === 415 ? 400 : 502
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return adminError("Backend returned an invalid image response.", "upstream", 502);
  }
  return NextResponse.json(payload, {
    status: response.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
