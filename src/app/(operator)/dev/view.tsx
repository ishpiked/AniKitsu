"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "@/lib/icons";
import { useKitsu } from "@/hooks/use-kitsu";
import {
  RefreshControls,
  useDashboardControls,
} from "@/components/refresh-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChartShell,
  KpiCard,
  PanelError,
  TimeSeriesChart,
} from "@/components/charts";
import { AdminState } from "@/components/admin-state";
import { StatusBadge } from "@/components/status";
import {
  apiLatencySeries,
  formatAgo,
  formatDuration,
  formatMs,
  formatNumber,
  formatPercent,
  formatUtc,
  meanLatencyMs,
  overallState,
  providerCounts,
  requestRates,
  summarizeRequests,
  type RateSample,
} from "@/lib/kitsu/derive";
import type {
  AdminOverview,
  MonitoringResponse,
  OverallState,
  PrometheusData,
} from "@/lib/kitsu/types";
import { cn } from "cn";

const stateClass: Record<OverallState, string> = {
  operational: "border-emerald-500/50",
  degraded: "border-amber-500/50",
  down: "border-red-500/60",
  unknown: "border-dashed",
};

const stateLabel: Record<OverallState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

export interface Initial<T> {
  data: T | null;
  error: string | null;
  code?: string | null;
}

function generatedAtMs(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export default function OverviewView({
  initialHours,
  initialMonitoring,
  initialMetrics,
  initialHealth,
  initialAdmin,
}: {
  initialHours: number;
  initialMonitoring: Initial<MonitoringResponse>;
  initialMetrics: Initial<PrometheusData>;
  initialHealth: Initial<{ status: string }>;
  initialAdmin: Initial<AdminOverview>;
}) {
  const fetchedAt = generatedAtMs(initialMonitoring.data?.generated_at);
  const { hours, setHours, paused, setPaused } =
    useDashboardControls(initialHours);
  const monitoring = useKitsu<MonitoringResponse>("api/monitoring", {
    hours,
    paused,
    initialData: initialMonitoring.data ?? undefined,
    initialError: initialMonitoring.error,
    initialAt: fetchedAt,
  });
  const metrics = useKitsu<PrometheusData>("metrics", {
    paused,
    initialData: initialMetrics.data ?? undefined,
    initialError: initialMetrics.error,
    initialAt: fetchedAt,
  });
  const health = useKitsu<{ status: string }>("health", {
    paused,
    initialData: initialHealth.data ?? undefined,
    initialError: initialHealth.error,
    initialAt: fetchedAt,
  });
  const admin = useKitsu<AdminOverview>("api/admin/overview", {
    paused,
    initialData: initialAdmin.data ?? undefined,
    initialError: initialAdmin.error,
    initialCode: initialAdmin.code,
    initialAt: fetchedAt,
  });

  const prevRates = React.useRef<RateSample | null>(null);
  const [rates, setRates] = React.useState<{
    totals: ReturnType<typeof summarizeRequests>;
    rps: number | null;
    err5xxRps: number | null;
    err5xxRatio: number | null;
  } | null>(null);
  React.useEffect(() => {
    if (!metrics.data) return;
    const totals = summarizeRequests(metrics.data.httpRequests);
    const current: RateSample = {
      at: Date.parse(metrics.data.scrapedAt),
      totals,
    };
    const prev = prevRates.current;
    prevRates.current = current;
    setRates(
      prev
        ? { totals, ...requestRates(prev, current) }
        : { totals, rps: null, err5xxRps: null, err5xxRatio: null }
    );
  }, [metrics.data]);

  const refreshAll = () => {
    monitoring.refresh();
    metrics.refresh();
    health.refresh();
    admin.refresh();
  };
  const loading = monitoring.loading && monitoring.data === null;
  const live = monitoring.error === null && metrics.error === null;
  const db = admin.data?.database ?? null;
  const adminRooms = admin.data?.rooms ?? null;

  const current = monitoring.data?.current ?? null;
  const verdict = current ? overallState(current) : null;
  const providers = current ? providerCounts(current.servers) : null;
  const meanMs = metrics.data
    ? meanLatencyMs(metrics.data.httpDurationSum, metrics.data.httpDurationCount)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Live operator summary.{" "}
            {monitoring.data
              ? `Sampled ${formatAgo(monitoring.data.current.timestamp)} · generated ${formatUtc(monitoring.data.generated_at)}.`
              : "Waiting for the first backend snapshot."}
          </p>
        </div>
        <RefreshControls
          hours={hours}
          onHours={setHours}
          paused={paused}
          onPaused={setPaused}
          onRefresh={refreshAll}
          updatedAt={monitoring.updatedAt}
          live={live}
        />
      </div>

      {monitoring.sessionExpired || metrics.sessionExpired ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm"
        >
          Operator session expired.{" "}
          <Link href="/login" className="font-medium underline">
            Sign in again
          </Link>
          .
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Loading backend snapshots…
            </p>
          </CardContent>
        </Card>
      ) : null}

      {monitoring.error && !monitoring.data ? (
        <PanelError message={monitoring.error} onRetry={monitoring.refresh} />
      ) : null}

      {verdict && current ? (
        <Card className={cn("border-2", stateClass[verdict.state])}>
          <CardHeader className="pb-2">
            <CardDescription>Overall state</CardDescription>
            <CardTitle className="text-2xl">{stateLabel[verdict.state]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {verdict.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {monitoring.error ? (
              <p className="pt-2 text-sm text-amber-600 dark:text-amber-400">
                Showing the last good snapshot; the latest refresh failed:{" "}
                {monitoring.error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {current ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>API</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <StatusBadge status={current.api?.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                Latency (recent window):{" "}
                <strong className="tabular-nums">
                  {formatMs(current.api?.latency_ms)}
                </strong>{" "}
                mean ·{" "}
                <strong className="tabular-nums">
                  {formatMs(current.api?.p95_latency_ms)}
                </strong>{" "}
                p95
              </p>
              <p>
                Samples:{" "}
                <strong className="tabular-nums">
                  {formatNumber(current.api?.samples)}
                </strong>{" "}
                · errors in window:{" "}
                <strong className="tabular-nums">
                  {formatNumber(current.api?.error_count)}
                </strong>
              </p>
              <p>
                Uptime:{" "}
                <strong className="tabular-nums">
                  {formatPercent(monitoring.data?.uptime.api.uptime_percent)}
                </strong>{" "}
                <span className="text-muted-foreground">
                  ({formatNumber(monitoring.data?.uptime.api.observed_samples)}/
                  {formatNumber(monitoring.data?.uptime.api.expected_samples)}{" "}
                  samples ·{" "}
                  {formatPercent(
                    monitoring.data?.uptime.api.coverage_percent
                  )}{" "}
                  coverage)
                </span>
              </p>
              <p>
                Process uptime:{" "}
                <strong className="tabular-nums">
                  {formatDuration(current.api?.uptime_seconds)}
                </strong>{" "}
                <span className="text-muted-foreground">
                  (resets on backend restart)
                </span>
              </p>
              <Separator className="my-1" />
              <p>
                Reachability (/health):{" "}
                {health.data ? (
                  <strong>{health.data.status}</strong>
                ) : health.error ? (
                  <span className="text-red-600 dark:text-red-400">
                    unreachable: {health.error}
                  </span>
                ) : (
                  "…"
                )}{" "}
                <span className="text-muted-foreground">
                  (liveness only; proves nothing about MongoDB, polling, or
                  providers)
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Telegram bot</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <StatusBadge status={current.bot?.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                Probe latency (getMe round trip):{" "}
                <strong className="tabular-nums">
                  {formatMs(current.bot?.latency_ms)}
                </strong>
              </p>
              <p>
                Uptime:{" "}
                <strong className="tabular-nums">
                  {formatPercent(monitoring.data?.uptime.bot.uptime_percent)}
                </strong>{" "}
                <span className="text-muted-foreground">
                  ({formatNumber(monitoring.data?.uptime.bot.observed_samples)}{" "}
                  observed ·{" "}
                  {formatPercent(
                    monitoring.data?.uptime.bot.coverage_percent
                  )}{" "}
                  coverage)
                </span>
              </p>
              <p className="text-muted-foreground">
                {current.bot?.status === "disabled"
                  ? "No BOT_TOKEN configured. Disabled is a configuration state, not an outage."
                  : "A passing probe confirms the token/API works; it does not prove long polling is receiving updates."}
              </p>
              {metrics.data?.botEnabled !== null &&
              metrics.data?.botEnabled !== undefined ? (
                <p>
                  Token configured:{" "}
                  <strong>{metrics.data.botEnabled ? "yes" : "no"}</strong>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Providers</CardDescription>
              <CardTitle className="text-lg">
                {providers ? (
                  <span className="tabular-nums">
                    {providers.up}/{providers.total} up
                  </span>
                ) : (
                  "—"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {providers ? (
                <>
                  <p>
                    Down:{" "}
                    <strong className="tabular-nums">{providers.down}</strong>{" "}
                    · stale:{" "}
                    <strong className="tabular-nums">{providers.stale}</strong>{" "}
                    · no data:{" "}
                    <strong className="tabular-nums">
                      {providers.unknown}
                    </strong>
                  </p>
                  <p>
                    Inventory:{" "}
                    <StatusBadge
                      status={current.server_inventory_status}
                    />{" "}
                    <span className="text-muted-foreground">
                      probed {formatAgo(current.server_probe_at)} (10-min
                      cadence; values reused between probes)
                    </span>
                  </p>
                  <p>
                    <Link
                      href="/dev/providers"
                      className="font-medium underline"
                    >
                      Open provider detail
                    </Link>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No provider data.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>HTTP traffic (this process)</CardDescription>
              <CardTitle className="text-lg tabular-nums">
                {rates ? `${rates.rps === null ? "—" : rates.rps.toFixed(2)} req/s` : "Collecting…"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {metrics.error && !metrics.data ? (
                <PanelError message={metrics.error} onRetry={metrics.refresh} />
              ) : (
                <>
                  <p>
                    Total:{" "}
                    <strong className="tabular-nums">
                      {formatNumber(rates?.totals.total)}
                    </strong>{" "}
                    · 5xx:{" "}
                    <strong className="tabular-nums">
                      {formatNumber(rates?.totals.err5xx)}
                    </strong>{" "}
                    (
                    {rates?.err5xxRatio === null || rates?.err5xxRatio === undefined
                      ? "—"
                      : formatPercent(rates.err5xxRatio * 100)}
                    )
                  </p>
                  <p>
                    5xx rate:{" "}
                    <strong className="tabular-nums">
                      {rates?.err5xxRps === null || rates?.err5xxRps === undefined
                        ? "—"
                        : `${rates.err5xxRps.toFixed(3)}/s`}
                    </strong>{" "}
                    · mean latency:{" "}
                    <strong className="tabular-nums">{formatMs(meanMs)}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Rates need two consecutive scrapes and reset when the
                    backend process restarts. Not fleet totals.
                  </p>
                  {metrics.error ? (
                    <p className="text-amber-600 dark:text-amber-400">
                      Latest scrape failed; showing previous values:{" "}
                      {metrics.error}
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Audience (MongoDB, current)</CardDescription>
              <CardTitle className="text-lg tabular-nums">
                {formatNumber(metrics.data?.usersTotal)} users
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                Active users:{" "}
                <strong className="tabular-nums">
                  {formatNumber(metrics.data?.usersActive)}
                </strong>
              </p>
              <p>
                Groups:{" "}
                <strong className="tabular-nums">
                  {formatNumber(metrics.data?.groupsTotal)}
                </strong>{" "}
                total ·{" "}
                <strong className="tabular-nums">
                  {formatNumber(metrics.data?.groupsActive)}
                </strong>{" "}
                active
              </p>
              <p>
                <Link
                  href="/dev/audience"
                  className="font-medium underline"
                >
                  Open audience detail
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monitoring history</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                {monitoring.data?.history_persistent &&
                monitoring.data?.history_storage === "mongodb" ? (
                  <span>mongodb · persistent</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <AlertTriangle
                      className="size-4 text-amber-500"
                      aria-hidden
                    />
                    memory-only
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                Retention:{" "}
                <strong>
                  {monitoring.data?.history_retention_days ?? "—"} days
                </strong>{" "}
                · snapshots every{" "}
                <strong>
                  {monitoring.data?.sample_interval_seconds ?? "—"}s
                </strong>
              </p>
              <p className="text-muted-foreground">
                {monitoring.data?.history_persistent
                  ? "Snapshots persist across restarts."
                  : "History lives in process memory and is lost on restart. That is not the same as 90-day history."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Database</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                {db ? (
                  <StatusBadge status={db.status} />
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {admin.data ? (
                <>
                  <p>
                    MongoDB reachability:{" "}
                    <strong>{db?.status ?? "no data"}</strong>
                    {db?.reason ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {db.reason}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    A database signal here is reachability for the admin
                    read path, not a full database health check.
                  </p>
                </>
              ) : (
                <AdminState
                  code={admin.errorCode}
                  error={admin.error}
                  onRetry={admin.refresh}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {monitoring.data && monitoring.data.history.length > 0 ? (
        <ChartShell
          title="API latency"
          description="Mean vs p95 of recent completed requests (5-minute rolling window, /metrics scrapes excluded)."
          meta={`Range: last ${monitoring.data.history_hours}h · source samples every ${monitoring.data.sample_interval_seconds}s · times in UTC`}
        >
          <TimeSeriesChart
            points={apiLatencySeries(monitoring.data.history).map((p) => ({
              t: p.t,
              values: { mean: p.mean, p95: p.p95 },
            }))}
            series={[
              { key: "mean", label: "Mean", color: "#0ea5e9" },
              { key: "p95", label: "p95", color: "#8b5cf6" },
            ]}
            formatY={(v) => `${Math.round(v)} ms`}
          />
        </ChartShell>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label="Latest sample"
          value={
            current ? formatUtc(current.timestamp) : "—"
          }
          sub={`Backend generated this view ${monitoring.data ? formatAgo(monitoring.data.generated_at) : "—"}.`}
        />
        {adminRooms && adminRooms.active_count !== null ? (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Watch Together rooms</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {adminRooms.active_count}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Active rooms on this backend process
                {adminRooms.scope ? ` (${adminRooms.scope})` : ""}.{" "}
                <Link href="/dev/rooms" className="font-medium underline">
                  Open room detail
                </Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Watch Together rooms</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminState
                code={admin.errorCode}
                error={admin.error}
                onRetry={admin.refresh}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
