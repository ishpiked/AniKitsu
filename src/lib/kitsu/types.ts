// Types for the Kitsu FastAPI backend (verified against the live API).
// Fields are nullable: the backend returns null where no probe/observation
// exists. Never render null as zero or "up".

export interface ApiSample {
  status: string | null;
  uptime_seconds: number | null;
  latency_ms: number | null;
  p95_latency_ms: number | null;
  samples: number | null;
  error_count: number | null;
}

export interface BotSample {
  status: string | null;
  latency_ms: number | null;
}

export interface MonitoringSnapshot {
  timestamp: string;
  api: ApiSample | null;
  bot: BotSample | null;
  expires_at?: string | null;
}

export interface UptimeBlock<T> {
  current: T | null;
  uptime_percent: number | null;
  observed_samples: number | null;
  expected_samples: number | null;
  coverage_percent: number | null;
}

export type OverallState = "operational" | "degraded" | "down" | "unknown";

export interface StateChange {
  t: string;
  name: string;
  from: string | null;
  to: string | null;
}

export interface MonitoringResponse {
  generated_at: string;
  history_hours: number;
  sample_interval_seconds: number;
  history_retention_days: number;
  history_persistent: boolean;
  history_storage: string | null;
  current: MonitoringSnapshot;
  uptime: {
    api: UptimeBlock<ApiSample>;
    bot: UptimeBlock<BotSample>;
  };
  history: MonitoringSnapshot[];
  /** Attached by the BFF: transitions from the full (pre-decimation) history. */
  transitions?: StateChange[];
  /** Attached by the BFF when history was decimated for transfer/render. */
  decimated?: boolean;
  effective_interval_seconds?: number;
}

// --- Admin API (/api/admin/v1, bearer-protected, read-only) ---
// Field shapes follow the backend contract; everything stays nullable
// because the backend returns null for unreadable components.

export type AnalyticsBucket = "day" | "week" | "month";

export interface AdminDatabaseStatus {
  status: string | null;
  reason?: string | null;
}

export interface AdminAudienceTotals {
  total: number | null;
  active: number | null;
  active_basis?: string | null;
}

export interface AdminOverview {
  generated_at: string | null;
  database: AdminDatabaseStatus | null;
  audience: {
    users: AdminAudienceTotals | null;
    groups: AdminAudienceTotals | null;
  } | null;
  monitoring: {
    latest_sample_at: string | null;
    history_storage: string | null;
  } | null;
}

export interface AudienceBucket {
  start: string;
  end: string;
  active_users: number | null;
  user_joins: number | null;
  user_leaves: number | null;
  group_joins: number | null;
  group_leaves: number | null;
}

export interface AlertBucket {
  start: string;
  end: string;
  [key: string]: unknown;
}

export interface AnalyticsResponse<TBucket> {
  generated_at: string | null;
  from: string | null;
  to: string | null;
  bucket: AnalyticsBucket | string;
  timezone?: string | null;
  definitions?: Record<string, unknown> | null;
  coverage_start?: string | null;
  buckets: TBucket[];
}

export type AudienceAnalytics = AnalyticsResponse<AudienceBucket>;
export type AlertAnalytics = AnalyticsResponse<AlertBucket>;

// --- Public (unauthenticated) status surface ---
// Deliberately narrow: no audience totals, no error/sample internals.

export interface PublicHistoryPoint {
  t: string;
  api: {
    status: string | null;
    latency_ms: number | null;
    p95_latency_ms: number | null;
  };
  bot: { status: string | null; latency_ms: number | null };
}

/** Uptime aggregates only — never embeds the raw `current` sample. */
export interface PublicUptime {
  uptime_percent: number | null;
  observed_samples: number | null;
  expected_samples: number | null;
  coverage_percent: number | null;
}

export interface PublicStatus {
  generated_at: string;
  history_hours: number;
  sample_interval_seconds: number;
  effective_interval_seconds: number;
  persistent_history: boolean;
  verdict: { state: OverallState; reasons: string[] };
  api: {
    status: string | null;
    latency_ms: number | null;
    p95_latency_ms: number | null;
    uptime_seconds: number | null;
    uptime: PublicUptime;
  };
  bot: {
    status: string | null;
    latency_ms: number | null;
    uptime: PublicUptime;
  };
  history: PublicHistoryPoint[];
  transitions: StateChange[];
}

export interface MonitoringHistoryResponse {
  hours: number;
  sample_interval_seconds: number;
  history: MonitoringSnapshot[];
}

export interface HttpCounter {
  method: string;
  status: string;
  value: number;
}

export interface HttpDurationStat {
  method: string;
  value: number;
}

export interface PrometheusData {
  scrapedAt: string;
  uptimeSeconds: number | null;
  botEnabled: boolean | null;
  usersTotal: number | null;
  usersActive: number | null;
  groupsTotal: number | null;
  groupsActive: number | null;
  httpRequests: HttpCounter[];
  httpDurationSum: HttpDurationStat[];
  httpDurationCount: HttpDurationStat[];
}
