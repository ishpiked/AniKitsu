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

export interface ProviderSample {
  status: string | null;
  latency_ms: number | null;
  stale: boolean | null;
  error?: string | null;
}

export interface MonitoringSnapshot {
  timestamp: string;
  api: ApiSample | null;
  bot: BotSample | null;
  servers: Record<string, ProviderSample>;
  server_probe_at: string | null;
  server_inventory_status: string | null;
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
    servers: Record<string, UptimeBlock<ProviderSample>>;
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
  rooms: {
    status: string | null;
    active_count: number | null;
    scope?: string | null;
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

export interface WatchTimeBucket {
  start: string;
  end: string;
  watch_time_seconds: {
    movie: number | null;
    series: number | null;
  };
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
export type WatchTimeAnalytics = AnalyticsResponse<WatchTimeBucket>;
export type AlertAnalytics = AnalyticsResponse<AlertBucket>;

export interface AdminRoom {
  room_id: string;
  origin: {
    type: string | null;
    moderation_ref?: string | null;
  } | null;
  title: {
    media_type: string | null;
    name: string | null;
    season: number | null;
    episode: number | null;
  } | null;
  participant_count: number | null;
  host_present: boolean | null;
  cohost_present: boolean | null;
  locked: boolean | null;
  playback: {
    state: string | null;
    position_seconds: number | null;
    idle_expires_at: string | null;
  } | null;
}

export interface AdminRoomsResponse {
  rooms: AdminRoom[];
  total?: number | null;
  limit?: number | null;
  offset?: number | null;
  scope?: string | null;
  generated_at?: string | null;
}

export interface ActivityItem {
  entity: string;
  event_type: string;
  timestamp: string;
}

export interface ActivityResponse {
  items: ActivityItem[];
  total?: number | null;
  limit?: number | null;
  offset?: number | null;
}

// --- Public (unauthenticated) status surface ---
// Deliberately narrow: no audience totals, no error/sample internals.

export interface PublicProviderStatus {
  name: string;
  status: string | null;
  stale: boolean | null;
  latency_ms: number | null;
  error: string | null;
  uptime_percent: number | null;
  observed_samples: number | null;
  coverage_percent: number | null;
}

export interface PublicHistoryPoint {
  t: string;
  api: {
    status: string | null;
    latency_ms: number | null;
    p95_latency_ms: number | null;
  };
  bot: { status: string | null; latency_ms: number | null };
  servers: Record<
    string,
    { status: string | null; stale: boolean | null; latency_ms: number | null }
  >;
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
  inventory_status: string | null;
  probe_at: string | null;
  providers: PublicProviderStatus[];
  history: PublicHistoryPoint[];
  transitions: StateChange[];
}

export interface MonitoringHistoryResponse {
  hours: number;
  sample_interval_seconds: number;
  history: MonitoringSnapshot[];
}

export interface ProviderInfo {
  name: string;
  status: string | null;
  language?: string | null;
  description?: string | null;
  "4k"?: boolean | null;
  protocols?: string[] | null;
  qualities?: string[] | null;
  capabilities?: Record<string, unknown> | null;
  disabled?: boolean | null;
  provider?: string | null;
  movieOnly?: boolean | null;
}

export interface ServersResponse {
  servers: ProviderInfo[];
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

export interface PersonalProfile {
  user: {
    user_id: number;
    photo_url: string | null;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    first_seen: string | null;
    last_active: string | null;
    is_active: boolean | null;
    is_donor: boolean | null;
    donated_stars: number | null;
    alerts_on: boolean | null;
  };
  watch_requests: {
    movies: number;
    series: number;
    total: number;
  };
  watch_time_seconds: {
    movies: number | null;
    series: number | null;
    total: number | null;
  };
  recent_watches: Array<{
    title: string;
    media_type: string;
    season: number | null;
    episode: number | null;
    updated_at: string | null;
    completed: boolean | null;
    position_seconds: number | null;
    duration_seconds: number | null;
  }>;
  recent_activity: Array<{
    event_type: string;
    timestamp: string;
  }>;
}
