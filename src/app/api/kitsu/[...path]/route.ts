import { NextResponse } from "next/server";
import { isOperatorRequest } from "@/lib/auth";
import {
  BACKEND_TIMEOUT_MS,
  adminToken,
  backendBaseUrl,
  clampHours,
  clampInt,
  parseBucket,
  parseEntity,
  parseToken,
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

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  if (!(await isOperatorRequest(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { path } = await ctx.params;
  const key = (path ?? []).join("/");
  const url = new URL(request.url);
  const params = url.searchParams;

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
  if (key === "api/admin/rooms") {
    const limit = clampInt(params.get("limit"), 1, 200, 20);
    const offset = clampInt(params.get("offset"), 0, 10000, 0);
    return proxyAdmin(`/api/admin/v1/rooms?limit=${limit}&offset=${offset}`);
  }
  if (key === "api/admin/activity") {
    const entity = parseEntity(params.get("entity") ?? "all") ?? "all";
    const hours = clampInt(params.get("hours"), 1, 2160, 168);
    const limit = clampInt(params.get("limit"), 1, 200, 50);
    const offset = clampInt(params.get("offset"), 0, 10000, 0);
    const query = new URLSearchParams({
      entity,
      hours: String(hours),
      limit: String(limit),
      offset: String(offset),
    });
    const entityId = parseToken(params.get("entity_id"));
    const eventType = parseToken(params.get("event_type"));
    if (
      (params.get("entity_id") && !entityId) ||
      (params.get("event_type") && !eventType)
    ) {
      return adminError(
        "entity_id and event_type accept letters, digits, dot, dash, underscore (max 64).",
        "bad-request",
        400
      );
    }
    if (entityId) query.set("entity_id", entityId);
    if (eventType) query.set("event_type", eventType);
    return proxyAdmin(`/api/admin/v1/activity?${query}`);
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
