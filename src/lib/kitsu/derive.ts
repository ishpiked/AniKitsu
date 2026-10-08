import type {
  HttpCounter,
  HttpDurationStat,
  MonitoringSnapshot,
  OverallState,
  StateChange,
} from "./types";

export interface OverallVerdict {
  state: OverallState;
  reasons: string[];
}

/**
 * Derive the overall state from one snapshot. Never derive health solely
 * from /health: API, bot probe, inventory, and provider states all count.
 */
export function overallState(current: MonitoringSnapshot): OverallVerdict {
  const reasons: string[] = [];
  const apiStatus = current.api?.status ?? null;

  if (apiStatus === null) {
    return { state: "unknown", reasons: ["Latest snapshot has no API sample."] };
  }
  if (apiStatus !== "up") {
    return {
      state: "down",
      reasons: [`API snapshot status is "${apiStatus}".`],
    };
  }

  const degraded: string[] = [];
  const botStatus = current.bot?.status ?? null;
  if (botStatus === "down") degraded.push("Telegram bot probe is down.");
  else if (botStatus === "disabled")
    reasons.push("Telegram bot is not configured (no BOT_TOKEN).");
  else if (botStatus !== "up")
    degraded.push("Telegram bot probe returned no data.");

  if (
    current.server_inventory_status !== null &&
    current.server_inventory_status !== "up"
  ) {
    degraded.push("Provider inventory fetch failed.");
  }

  const entries = Object.entries(current.servers ?? {});
  const down = entries.filter(([, s]) => s.status === "down").map(([n]) => n);
  const unknown = entries
    .filter(([, s]) => s.status === null || s.status === undefined)
    .map(([n]) => n);
  if (down.length > 0) degraded.push(`Providers down: ${down.join(", ")}.`);
  if (unknown.length > 0)
    degraded.push(`Providers with no data: ${unknown.join(", ")}.`);

  if (degraded.length > 0) return { state: "degraded", reasons: degraded };
  if (entries.length === 0)
    return { state: "unknown", reasons: ["Snapshot carries no provider data."] };
  reasons.push("API, bot probe, inventory, and all providers report up.");
  return { state: "operational", reasons };
}

export type Tone = "up" | "down" | "disabled" | "warn" | "neutral" | "nodata";

export interface StatusView {
  label: string;
  tone: Tone;
}

/** Normalize any backend status string (or null) to a labelled tone. */
export function statusView(status: string | null | undefined): StatusView {
  if (status === null || status === undefined || status === "") {
    return { label: "No data", tone: "nodata" };
  }
  switch (status) {
    case "up":
    case "ok":
      return { label: "Up", tone: "up" };
    case "down":
    case "error":
      return { label: "Down", tone: "down" };
    case "disabled":
      return { label: "Disabled", tone: "disabled" };
    default:
      return { label: status, tone: "warn" };
  }
}

export interface ProviderCounts {
  total: number;
  up: number;
  down: number;
  unknown: number;
  stale: number;
}

export function providerCounts(
  servers: MonitoringSnapshot["servers"]
): ProviderCounts {
  const entries = Object.values(servers ?? {});
  return {
    total: entries.length,
    up: entries.filter((s) => s.status === "up").length,
    down: entries.filter((s) => s.status === "down").length,
    unknown: entries.filter((s) => s.status == null).length,
    stale: entries.filter((s) => s.stale === true).length,
  };
}

// --- Time-series extraction (one history fetch → all charts) ---

export interface LatencyPoint {
  t: string;
  mean: number | null;
  p95: number | null;
}

export function apiLatencySeries(history: MonitoringSnapshot[]): LatencyPoint[] {
  return history.map((s) => ({
    t: s.timestamp,
    mean: s.api?.latency_ms ?? null,
    p95: s.api?.p95_latency_ms ?? null,
  }));
}

export interface ErrorPoint {
  t: string;
  errors: number | null;
}

export function apiErrorSeries(history: MonitoringSnapshot[]): ErrorPoint[] {
  return history.map((s) => ({
    t: s.timestamp,
    errors: s.api?.error_count ?? null,
  }));
}

export interface BotLatencyPoint {
  t: string;
  latency: number | null;
}

export function botLatencySeries(
  history: MonitoringSnapshot[]
): BotLatencyPoint[] {
  return history.map((s) => ({
    t: s.timestamp,
    latency: s.bot?.status === "up" ? (s.bot.latency_ms ?? null) : null,
  }));
}

export interface ProviderLatencyPoint {
  t: string;
  latency: number | null;
  stale: boolean;
}

export function providerLatencySeries(
  history: MonitoringSnapshot[],
  name: string
): ProviderLatencyPoint[] {
  return history.map((s) => {
    const sample = s.servers?.[name];
    return {
      t: s.timestamp,
      // Stale reuses keep their value but are flagged so charts can mark
      // them as stale instead of plotting them as fresh measurements.
      latency: sample?.latency_ms ?? null,
      stale: sample?.stale === true,
    };
  });
}

/** Health transitions across a history, latest first, capped. */
export function computeTransitions(
  history: MonitoringSnapshot[],
  names?: string[],
  limit = 500
): StateChange[] {
  const set = new Set<string>(names ?? []);
  if (!names) {
    for (const snap of history) {
      for (const name of Object.keys(snap.servers ?? {})) set.add(name);
    }
  }
  const ordered = [...set].sort();
  const changes: StateChange[] = [];
  const last: Record<string, string | null | undefined> = {};
  for (const snap of history) {
    for (const name of ordered) {
      const status = snap.servers?.[name]?.status ?? null;
      if (name in last && last[name] !== status) {
        changes.push({ t: snap.timestamp, name, from: last[name] ?? null, to: status });
      }
      last[name] = status;
    }
  }
  return changes.reverse().slice(0, limit);
}

export type TimelineStatus = "up" | "down" | "disabled" | "unknown" | "nodata";

export interface TimelinePoint {
  t: string;
  status: TimelineStatus;
}

export function toTimelineStatus(
  status: string | null | undefined
): TimelineStatus {
  if (status === null || status === undefined || status === "") return "nodata";
  if (status === "up" || status === "ok") return "up";
  if (status === "down") return "down";
  if (status === "disabled") return "disabled";
  return "unknown";
}

export function serviceTimeline(
  history: MonitoringSnapshot[],
  pick: (s: MonitoringSnapshot) => string | null | undefined
): TimelinePoint[] {
  return history.map((s) => ({ t: s.timestamp, status: toTimelineStatus(pick(s)) }));
}

// --- Request totals / rates from Prometheus counters ---

export interface RequestTotals {
  total: number;
  ok: number;
  err4xx: number;
  err5xx: number;
}

export function summarizeRequests(counters: HttpCounter[]): RequestTotals {
  let total = 0;
  let ok = 0;
  let err4xx = 0;
  let err5xx = 0;
  for (const c of counters) {
    total += c.value;
    if (c.status.startsWith("2")) ok += c.value;
    else if (c.status.startsWith("4")) err4xx += c.value;
    else if (c.status.startsWith("5")) err5xx += c.value;
  }
  return { total, ok, err4xx, err5xx };
}

export function meanLatencyMs(
  sum: HttpDurationStat[],
  count: HttpDurationStat[]
): number | null {
  const totalSum = sum.reduce((acc, s) => acc + s.value, 0);
  const totalCount = count.reduce((acc, s) => acc + s.value, 0);
  if (totalCount <= 0) return null;
  return (totalSum / totalCount) * 1000;
}

export interface RateSample {
  at: number;
  totals: RequestTotals;
}

export interface RequestRates {
  rps: number | null;
  err5xxRps: number | null;
  err5xxRatio: number | null;
}

/** Derive per-second rates from two consecutive counter snapshots. */
export function requestRates(prev: RateSample, next: RateSample): RequestRates {
  const dt = (next.at - prev.at) / 1000;
  if (!(dt > 0)) return { rps: null, err5xxRps: null, err5xxRatio: null };
  const dTotal = next.totals.total - prev.totals.total;
  const dErr = next.totals.err5xx - prev.totals.err5xx;
  if (dTotal < 0 || dErr < 0) {
    // Counters reset (process restart): refuse to fabricate a rate.
    return { rps: null, err5xxRps: null, err5xxRatio: null };
  }
  return {
    rps: dTotal / dt,
    err5xxRps: dErr / dt,
    err5xxRatio: dTotal > 0 ? dErr / dTotal : 0,
  };
}

/** UTC [from, to) window ending now, for analytics queries. */
export function analyticsWindow(
  hours: number,
  now = Date.now()
): { from: string; to: string } {
  return {
    from: new Date(now - hours * 3600 * 1000).toISOString(),
    to: new Date(now).toISOString(),
  };
}

/** Pull a coverage_start out of an analytics definitions block, if present. */
export function findCoverageStart(
  definitions: Record<string, unknown> | null | undefined
): string | null {
  if (!definitions || typeof definitions !== "object") return null;
  if (typeof definitions.coverage_start === "string") {
    return definitions.coverage_start;
  }
  for (const value of Object.values(definitions)) {
    if (
      value !== null &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).coverage_start === "string"
    ) {
      return (value as Record<string, unknown>).coverage_start as string;
    }
  }
  return null;
}

/** Numeric series per bucket for fields the contract does not name exactly. */
export function bucketNumericSeries<TBucket extends Record<string, unknown>>(
  buckets: TBucket[],
  exclude: string[] = ["start", "end"]
): {
  key: string;
  label: string;
  points: { t: string; value: number | null }[];
}[] {
  const keys = new Set<string>();
  for (const b of buckets) {
    for (const [k, v] of Object.entries(b)) {
      if (!exclude.includes(k) && (typeof v === "number" || v === null)) {
        keys.add(k);
      }
    }
  }
  return [...keys].sort().map((key) => ({
    key,
    label: key.replace(/_/g, " "),
    points: buckets.map((b) => ({
      t: String(b.start ?? ""),
      value:
        typeof b[key] === "number" && Number.isFinite(b[key])
          ? (b[key] as number)
          : null,
    })),
  }));
}

/** Compact duration for axis labels: 90s, 12m, 3.5h. */
export function formatShortDuration(
  v: number | null | undefined
): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (v < 60) return `${Math.round(v)}s`;
  if (v < 3600) return `${Math.round(v / 60)}m`;
  return `${(v / 3600).toFixed(v < 36000 ? 1 : 0)}h`;
}

// --- Formatting (UTC everywhere, explicit) ---

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatUtc(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function formatAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Process uptime labelled as process uptime (resets on backend restart). */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return "—";
  }
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function formatMs(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v >= 100 ? `${Math.round(v)} ms` : `${v.toFixed(1)} ms`;
}

export function formatNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US");
}

export function formatPercent(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}%`;
}
