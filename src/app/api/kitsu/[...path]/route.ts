import { NextResponse } from "next/server";
import { isOperatorRequest } from "@/lib/auth";
import {
  BACKEND_TIMEOUT_MS,
  backendBaseUrl,
  clampHours,
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

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  if (!(await isOperatorRequest(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { path } = await ctx.params;
  const key = (path ?? []).join("/");
  const route = ALLOWED[key];
  if (!route) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  let upstreamPath = route.upstream;
  if (key.startsWith("api/monitoring")) {
    upstreamPath += `?hours=${clampHours(url.searchParams.get("hours"))}`;
  }
  const cacheKey = `GET ${upstreamPath}`;

  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    return NextResponse.json(JSON.parse(cached), {
      headers: {
        "x-kitsu-cache": "HIT",
        "Cache-Control": "private, max-age=10",
      },
    });
  }

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
  return NextResponse.json(JSON.parse(serialized), {
    headers: {
      "x-kitsu-cache": "MISS",
      "Cache-Control": "private, max-age=10",
    },
  });
}
