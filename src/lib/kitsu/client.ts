import { computeTransitions, overallState } from "./derive";
import type {
  ActivityResponse,
  AdminOverview,
  AdminRoom,
  AdminRoomsResponse,
  AnalyticsBucket,
  AnalyticsResponse,
  HttpCounter,
  HttpDurationStat,
  MonitoringHistoryResponse,
  MonitoringResponse,
  MonitoringSnapshot,
  PrometheusData,
  PublicHistoryPoint,
  PublicStatus,
  ServersResponse,
} from "./types";

export const MIN_HISTORY_HOURS = 1;
export const MAX_HISTORY_HOURS = 2160; // 90 days, per backend contract
export const DEFAULT_HISTORY_HOURS = 24;
export const BACKEND_TIMEOUT_MS = 15000;

export function backendBaseUrl(): string {
  const raw = process.env.KITSU_API_URL ?? "";
  if (!raw) throw new Error("KITSU_API_URL is not configured");
  return raw.replace(/\/+$/, "");
}

/** Clamp the `hours` window to the backend-supported 1..2160 range. */
export function clampHours(raw: unknown): number {
  const n =
    typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n)) return DEFAULT_HISTORY_HOURS;
  return Math.min(MAX_HISTORY_HOURS, Math.max(MIN_HISTORY_HOURS, Math.floor(n)));
}

export const MAX_HISTORY_POINTS = 400;

/**
 * Uniformly decimate snapshots for transfer/render speed. Always keeps the
 * newest sample. Callers must surface `effective_interval_seconds` next to
 * any chart built from decimated data.
 */
export function decimateSnapshots<T extends { timestamp: string }>(
  history: T[],
  maxPoints = MAX_HISTORY_POINTS
): { history: T[]; decimated: boolean; effectiveIntervalSeconds: number | null } {
  if (history.length <= maxPoints) {
    return { history, decimated: false, effectiveIntervalSeconds: null };
  }
  const stride = Math.ceil(history.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < history.length; i += stride) out.push(history[i]);
  const last = history[history.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  let effective: number | null = null;
  if (history.length >= 2) {
    const first = Date.parse(history[0].timestamp);
    const end = Date.parse(last.timestamp);
    if (Number.isFinite(first) && Number.isFinite(end) && out.length > 1) {
      effective = Math.round((end - first) / 1000 / (out.length - 1));
    }
  }
  return { history: out, decimated: true, effectiveIntervalSeconds: effective };
}

/**
 * Shape a full monitoring payload for the browser: transitions are computed
 * from the COMPLETE history first, then the history itself is decimated.
 */
export function shapeMonitoringResponse(
  json: MonitoringResponse
): MonitoringResponse {
  const shaped = decimateSnapshots(json.history);
  return {
    ...json,
    history: shaped.history,
    transitions: computeTransitions(json.history),
    decimated: shaped.decimated,
    effective_interval_seconds:
      shaped.effectiveIntervalSeconds ?? json.sample_interval_seconds,
  };
}

function sanitizeHistoryPoint(s: MonitoringSnapshot): PublicHistoryPoint {
  const servers: PublicHistoryPoint["servers"] = {};
  for (const [name, sample] of Object.entries(s.servers ?? {})) {
    servers[name] = {
      status: sample?.status ?? null,
      stale: sample?.stale ?? null,
      latency_ms: sample?.latency_ms ?? null,
    };
  }
  return {
    t: s.timestamp,
    api: {
      status: s.api?.status ?? null,
      latency_ms: s.api?.latency_ms ?? null,
      p95_latency_ms: s.api?.p95_latency_ms ?? null,
    },
    bot: {
      status: s.bot?.status ?? null,
      latency_ms:
        s.bot?.status === "up" ? (s.bot.latency_ms ?? null) : null,
    },
    servers,
  };
}

/**
 * Strip a monitoring payload down to the public status surface: no audience
 * totals, no error/sample internals, no storage internals beyond persistence.
 */
function publicUptime(u: {
  uptime_percent?: number | null;
  observed_samples?: number | null;
  expected_samples?: number | null;
  coverage_percent?: number | null;
} | null | undefined) {
  return {
    uptime_percent: u?.uptime_percent ?? null,
    observed_samples: u?.observed_samples ?? null,
    expected_samples: u?.expected_samples ?? null,
    coverage_percent: u?.coverage_percent ?? null,
  };
}

export function sanitizePublicStatus(json: MonitoringResponse): PublicStatus {
  const shaped = decimateSnapshots(json.history);
  return {
    generated_at: json.generated_at,
    history_hours: json.history_hours,
    sample_interval_seconds: json.sample_interval_seconds,
    effective_interval_seconds:
      shaped.effectiveIntervalSeconds ?? json.sample_interval_seconds,
    persistent_history: json.history_persistent === true,
    verdict: overallState(json.current),
    api: {
      status: json.current.api?.status ?? null,
      latency_ms: json.current.api?.latency_ms ?? null,
      p95_latency_ms: json.current.api?.p95_latency_ms ?? null,
      uptime_seconds: json.current.api?.uptime_seconds ?? null,
      uptime: publicUptime(json.uptime.api),
    },
    bot: {
      status: json.current.bot?.status ?? null,
      latency_ms:
        json.current.bot?.status === "up"
          ? (json.current.bot.latency_ms ?? null)
          : null,
      uptime: publicUptime(json.uptime.bot),
    },
    inventory_status: json.current.server_inventory_status ?? null,
    probe_at: json.current.server_probe_at ?? null,
    providers: Object.entries(json.current.servers ?? {}).map(([name, s]) => ({
      name,
      status: s?.status ?? null,
      stale: s?.stale ?? null,
      latency_ms: s?.latency_ms ?? null,
      error: s?.error ?? null,
      uptime_percent: json.uptime.servers?.[name]?.uptime_percent ?? null,
      observed_samples: json.uptime.servers?.[name]?.observed_samples ?? null,
      coverage_percent: json.uptime.servers?.[name]?.coverage_percent ?? null,
    })),
    history: shaped.history.map(sanitizeHistoryPoint),
    transitions: computeTransitions(json.history).slice(0, 100),
  };
}

/** Shared owner API credential for /api/admin/v1. Server-side only. */
export function adminToken(): string {
  return process.env.KITSU_OWNER_API_TOKEN ?? "";
}

/** Clamp an integer query value into [min, max], else fallback. */
export function clampInt(
  raw: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n =
    typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function parseBucket(raw: unknown): AnalyticsBucket | null {
  return raw === "day" || raw === "week" || raw === "month" ? raw : null;
}

export function parseEntity(raw: unknown): "all" | "user" | "group" | null {
  return raw === "all" || raw === "user" || raw === "group" ? raw : null;
}

const TOKEN_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

/** entity_id / event_type allowlist: Telegram IDs and dotted event names. */
export function parseToken(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  return TOKEN_PATTERN.test(raw) ? raw : null;
}

export interface AdminWindow {
  from: string;
  to: string;
}

/**
 * Validate an RFC 3339 [from, to) window: ordered, max 366 days,
 * normalized to UTC ISO strings.
 */
export function parseWindow(
  fromRaw: unknown,
  toRaw: unknown
): AdminWindow | null {
  if (typeof fromRaw !== "string" || typeof toRaw !== "string") return null;
  const from = Date.parse(fromRaw);
  const to = Date.parse(toRaw);
  if (!Number.isFinite(from) || !Number.isFinite(to) || !(from < to)) {
    return null;
  }
  if (to - from > 366 * 24 * 3600 * 1000) return null;
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  };
}

async function fetchAdmin<T>(path: string): Promise<T> {
  const token = adminToken();
  if (!token) {
    throw new BackendError("Admin API token is not configured", 503);
  }
  const url = `${backendBaseUrl()}${path}`;
  const signal = AbortSignal.timeout(BACKEND_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });
  } catch (cause) {
    throw new BackendError(
      cause instanceof Error && cause.name === "TimeoutError"
        ? `Backend request timed out: ${path}`
        : `Backend unreachable: ${path}`,
      0
    );
  }
  if (!res.ok) {
    throw new BackendError(
      `Admin API responded ${res.status} for ${path}`,
      res.status
    );
  }
  return (await res.json()) as T;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return fetchAdmin<AdminOverview>("/api/admin/v1/overview");
}

export async function getAdminAnalytics<TBucket>(
  kind: "audience" | "watch-time" | "alerts",
  window: AdminWindow,
  bucket: AnalyticsBucket
): Promise<AnalyticsResponse<TBucket>> {
  const params = new URLSearchParams({
    from: window.from,
    to: window.to,
    bucket,
  });
  return fetchAdmin<AnalyticsResponse<TBucket>>(
    `/api/admin/v1/analytics/${kind}?${params}`
  );
}

export async function getAdminRooms(
  limit: number,
  offset: number
): Promise<AdminRoomsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const raw = await fetchAdmin<
    AdminRoomsResponse | AdminRoom[] | { items?: unknown }
  >(`/api/admin/v1/rooms?${params}`);
  // Tolerate a bare-array or {items:[...]} envelope as well as {rooms:[...]}.
  if (Array.isArray(raw)) return { rooms: raw };
  const rooms = (raw as AdminRoomsResponse).rooms;
  if (Array.isArray(rooms)) return { ...(raw as object), rooms };
  const items = (raw as { items?: unknown }).items;
  if (Array.isArray(items)) {
    return { ...(raw as object), rooms: items as AdminRoom[] };
  }
  return { ...(raw as object), rooms: [] };
}

export interface ActivityQuery {
  entity: "all" | "user" | "group";
  entityId: string | null;
  eventType: string | null;
  hours: number;
  limit: number;
  offset: number;
}

export async function getAdminActivity(
  query: ActivityQuery
): Promise<ActivityResponse> {
  const params = new URLSearchParams({
    entity: query.entity,
    hours: String(query.hours),
    limit: String(query.limit),
    offset: String(query.offset),
  });
  if (query.entityId) params.set("entity_id", query.entityId);
  if (query.eventType) params.set("event_type", query.eventType);
  return fetchAdmin<ActivityResponse>(`/api/admin/v1/activity?${params}`);
}

export class BackendError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchBackend(path: string): Promise<Response> {
  const url = `${backendBaseUrl()}${path}`;
  const signal = AbortSignal.timeout(BACKEND_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal,
      headers: { accept: "application/json" },
    });
  } catch (cause) {
    throw new BackendError(
      cause instanceof Error && cause.name === "TimeoutError"
        ? `Backend request timed out: ${path}`
        : `Backend unreachable: ${path}`,
      0
    );
  }
  return res;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetchBackend(path);
  if (!res.ok) {
    throw new BackendError(`Backend responded ${res.status} for ${path}`, res.status);
  }
  return (await res.json()) as T;
}

export async function getHealth(): Promise<{ status: string }> {
  return fetchJson<{ status: string }>("/health");
}

export async function getMonitoring(hours: number): Promise<MonitoringResponse> {
  return fetchJson<MonitoringResponse>(
    `/api/monitoring?hours=${clampHours(hours)}`
  );
}

export async function getMonitoringHistory(
  hours: number
): Promise<MonitoringHistoryResponse> {
  return fetchJson<MonitoringHistoryResponse>(
    `/api/monitoring/history?hours=${clampHours(hours)}`
  );
}

export async function getServers(): Promise<ServersResponse> {
  return fetchJson<ServersResponse>("/api/servers");
}

interface PrometheusSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

function parsePrometheusText(text: string): PrometheusSample[] {
  const samples: PrometheusSample[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+(\S+)/.exec(trimmed);
    if (!match) continue;
    const [, name, labelText, valueText] = match;
    const value = Number(valueText);
    if (!Number.isFinite(value)) continue;
    const labels: Record<string, string> = {};
    if (labelText) {
      for (const part of labelText.split(",")) {
        const eq = part.indexOf("=");
        if (eq > 0) {
          labels[part.slice(0, eq).trim()] = part
            .slice(eq + 1)
            .trim()
            .replace(/^"|"$/g, "");
        }
      }
    }
    samples.push({ name, labels, value });
  }
  return samples;
}

function gauge(samples: PrometheusSample[], name: string): number | null {
  const hit = samples.find((s) => s.name === name);
  return hit ? hit.value : null;
}

export function parsePrometheus(
  text: string
): Omit<PrometheusData, "scrapedAt"> {
  const samples = parsePrometheusText(text);
  const counters = (name: "kitsu_http_requests_total"): HttpCounter[] =>
    samples
      .filter((s) => s.name === name)
      .map((s) => ({
        method: s.labels.method ?? "?",
        status: s.labels.status ?? "?",
        value: s.value,
      }));
  const durations = (name: string): HttpDurationStat[] =>
    samples
      .filter((s) => s.name === name)
      .map((s) => ({ method: s.labels.method ?? "?", value: s.value }));

  const botEnabled = gauge(samples, "kitsu_bot_enabled");
  return {
    uptimeSeconds: gauge(samples, "kitsu_process_uptime_seconds"),
    botEnabled: botEnabled === null ? null : botEnabled === 1,
    usersTotal: gauge(samples, "kitsu_users_total"),
    usersActive: gauge(samples, "kitsu_users_active"),
    groupsTotal: gauge(samples, "kitsu_groups_total"),
    groupsActive: gauge(samples, "kitsu_groups_active"),
    httpRequests: counters("kitsu_http_requests_total"),
    httpDurationSum: durations("kitsu_http_request_duration_seconds_sum"),
    httpDurationCount: durations("kitsu_http_request_duration_seconds_count"),
  };
}

export async function getPrometheus(): Promise<PrometheusData> {
  const res = await fetchBackend("/metrics");
  if (!res.ok) {
    throw new BackendError(`Backend responded ${res.status} for /metrics`, res.status);
  }
  const text = await res.text();
  const samples = parsePrometheusText(text);
  const counters = (name: "kitsu_http_requests_total"): HttpCounter[] =>
    samples
      .filter((s) => s.name === name)
      .map((s) => ({
        method: s.labels.method ?? "?",
        status: s.labels.status ?? "?",
        value: s.value,
      }));
  const durations = (name: string): HttpDurationStat[] =>
    samples
      .filter((s) => s.name === name)
      .map((s) => ({ method: s.labels.method ?? "?", value: s.value }));

  const botEnabled = gauge(samples, "kitsu_bot_enabled");
  return {
    scrapedAt: new Date().toISOString(),
    uptimeSeconds: gauge(samples, "kitsu_process_uptime_seconds"),
    botEnabled: botEnabled === null ? null : botEnabled === 1,
    usersTotal: gauge(samples, "kitsu_users_total"),
    usersActive: gauge(samples, "kitsu_users_active"),
    groupsTotal: gauge(samples, "kitsu_groups_total"),
    groupsActive: gauge(samples, "kitsu_groups_active"),
    httpRequests: counters("kitsu_http_requests_total"),
    httpDurationSum: durations("kitsu_http_request_duration_seconds_sum"),
    httpDurationCount: durations("kitsu_http_request_duration_seconds_count"),
  };
}
