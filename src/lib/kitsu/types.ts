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
