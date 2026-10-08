import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { isOwnerUser } from "@/lib/owner";
import type { PersonalProfile } from "@/lib/kitsu/types";
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
// The browser never talks to the backend directly; operator data is checked
// against the verified owner identity below.
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

function profileError(
  error: string,
  code: AdminErrorCode,
  status: number
): NextResponse {
  return NextResponse.json(
    { error, code },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(
  source: Record<string, unknown>,
  key: string
): string | null {
  return typeof source[key] === "string" ? source[key] : null;
}

function countField(
  source: Record<string, unknown>,
  key: string
): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function nullableNumberField(
  source: Record<string, unknown>,
  key: string
): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableBooleanField(
  source: Record<string, unknown>,
  key: string
): boolean | null {
  return typeof source[key] === "boolean" ? source[key] : null;
}

function safeHttpsUrl(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function watchSecondsField(
  source: Record<string, unknown>,
  key: string
): number | null {
  if (!(key in source)) return 0;
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function profilePayload(
  json: unknown,
  userId: number,
  photoUrl: string | undefined
): PersonalProfile | null {
  const payload = record(json);
  const user = record(payload?.user);
  const requests = record(payload?.watch_requests);
  if (
    !payload ||
    !user ||
    !requests ||
    user.user_id !== userId ||
    !Array.isArray(payload.recent_watches) ||
    !Array.isArray(payload.recent_activity)
  ) {
    return null;
  }
  const movies = countField(requests, "movies");
  const series = countField(requests, "series");
  const total = countField(requests, "total");
  if (
    movies === null ||
    series === null ||
    total === null ||
    total !== movies + series
  ) {
    return null;
  }
  const movieSeconds = watchSecondsField(user, "watch_sec_movies");
  const seriesSeconds = watchSecondsField(user, "watch_sec_series");

  const recentWatches = payload.recent_watches
    .slice(0, 50)
    .flatMap((entry) => {
      const watch = record(entry);
      const title = watch ? stringField(watch, "title") : null;
      const mediaType = watch ? stringField(watch, "media_type") : null;
      if (!watch || !title || !mediaType) return [];
      return [
        {
          title,
          media_type: mediaType,
          season: nullableNumberField(watch, "season"),
          episode: nullableNumberField(watch, "episode"),
          updated_at: stringField(watch, "updated_at"),
          completed:
            typeof watch.completed === "boolean" ? watch.completed : null,
          position_seconds: nullableNumberField(watch, "position"),
          duration_seconds: nullableNumberField(watch, "duration"),
        },
      ];
    });

  const recentActivity = payload.recent_activity
    .slice(0, 50)
    .flatMap((entry) => {
      const activity = record(entry);
      const eventType = activity ? stringField(activity, "event_type") : null;
      const timestamp = activity ? stringField(activity, "timestamp") : null;
      if (!eventType || !timestamp) return [];
      return [{ event_type: eventType, timestamp }];
    });

  return {
    user: {
      user_id: userId,
      photo_url: safeHttpsUrl(photoUrl ?? null),
      first_name: stringField(user, "first_name"),
      last_name: stringField(user, "last_name"),
      username: stringField(user, "username"),
      first_seen: stringField(user, "first_seen"),
      last_active: stringField(user, "last_active"),
      is_active: nullableBooleanField(user, "is_active"),
      is_donor: nullableBooleanField(user, "is_donor"),
      donated_stars: countField(user, "donated_stars"),
      alerts_on: nullableBooleanField(user, "alerts_on"),
    },
    watch_requests: {
      movies,
      series,
      total,
    },
    watch_time_seconds: {
      movies: movieSeconds,
      series: seriesSeconds,
      total:
        movieSeconds !== null && seriesSeconds !== null
          ? movieSeconds + seriesSeconds
          : null,
    },
    recent_watches: recentWatches,
    recent_activity: recentActivity,
  };
}

/** Resolve a profile from its signed-in user ID, never a browser-supplied ID. */
async function proxyPersonalProfile(
  userId: number,
  photoUrl: string | undefined
): Promise<NextResponse> {
  const token = adminToken();
  if (!token) {
    return profileError(
      "Profile data is not configured: set KITSU_OWNER_API_TOKEN server-side.",
      "not-configured",
      503
    );
  }

  let baseUrl: string;
  try {
    baseUrl = backendBaseUrl();
  } catch (error) {
    return profileError(
      error instanceof Error ? error.message : "KITSU_API_URL is not configured.",
      "not-configured",
      503
    );
  }

  let res: Response;
  try {
    res = await fetch(
      `${baseUrl}/api/owner/users/${userId}?activity_limit=100&watch_limit=100`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    return profileError("Backend unreachable.", "unreachable", 502);
  }

  if (res.status === 404) {
    return NextResponse.json(
      { error: "No Kitsu profile was found for this account." },
      {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
  if (res.status === 401 || res.status === 403) {
    return profileError(
      "Backend refused the owner credential. Check KITSU_OWNER_API_TOKEN.",
      "forbidden",
      502
    );
  }
  if (!res.ok) {
    return profileError(`Backend responded ${res.status}.`, "upstream", 502);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return profileError(
      "Backend returned invalid profile data.",
      "upstream",
      502
    );
  }
  const profile = profilePayload(json, userId, photoUrl);
  if (!profile) {
    return profileError(
      "Backend returned an unexpected profile.",
      "upstream",
      502
    );
  }
  return NextResponse.json(profile, {
    headers: { "Cache-Control": "private, no-store" },
  });
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
  const { path } = await ctx.params;
  const key = (path ?? []).join("/");
  const url = new URL(request.url);
  const params = url.searchParams;

  if (key === "profile") {
    const session = await getRequestSession(request);
    if (session === null) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return proxyPersonalProfile(session.userId, session.photoUrl);
  }

  const session = await getRequestSession(request);
  if (session === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isOwnerUser(session.userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
