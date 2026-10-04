"use client";

import Link from "next/link";
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
import {
  BarChart,
  ChartShell,
  PanelError,
  StatusTimeline,
  TimeSeriesChart,
} from "@/components/charts";
import { StatusBadge } from "@/components/status";
import {
  apiErrorSeries,
  apiLatencySeries,
  botLatencySeries,
  formatNumber,
  formatPercent,
  serviceTimeline,
} from "@/lib/kitsu/derive";
import type { MonitoringResponse } from "@/lib/kitsu/types";

function UptimeLine({
  label,
  percent,
  observed,
  expected,
  coverage,
}: {
  label: string;
  percent: number | null | undefined;
  observed: number | null | undefined;
  expected: number | null | undefined;
  coverage: number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">
        {formatPercent(percent)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatNumber(observed)}/{formatNumber(expected)} samples observed ·{" "}
        {formatPercent(coverage)} coverage
      </p>
    </div>
  );
}

export default function HealthView({
  initialHours,
  initialMonitoring,
}: {
  initialHours: number;
  initialMonitoring: {
    data: MonitoringResponse | null;
    error: string | null;
  };
}) {
  const generated = initialMonitoring.data?.generated_at;
  const generatedMs = generated ? Date.parse(generated) : NaN;
  const fetchedAt = Number.isFinite(generatedMs) ? generatedMs : null;
  const { hours, setHours, paused, setPaused } =
    useDashboardControls(initialHours);
  const monitoring = useKitsu<MonitoringResponse>("api/monitoring", {
    hours,
    paused,
    initialData: initialMonitoring.data ?? undefined,
    initialError: initialMonitoring.error,
    initialAt: fetchedAt,
  });

  const refreshAll = () => monitoring.refresh();
  const history = monitoring.data?.history ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Service Health
          </h1>
          <p className="text-sm text-muted-foreground">
            Availability and latency from monitoring snapshots. Percentages are
            meaningless without the coverage shown beside them.
          </p>
        </div>
        <RefreshControls
          hours={hours}
          onHours={setHours}
          paused={paused}
          onPaused={setPaused}
          onRefresh={refreshAll}
          updatedAt={monitoring.updatedAt}
          live={monitoring.error === null}
        />
      </div>

      {monitoring.sessionExpired ? (
        <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
          Operator session expired.{" "}
          <Link href="/login" className="underline">
            Sign in again
          </Link>
          .
        </p>
      ) : null}
      {monitoring.error && !monitoring.data ? (
        <PanelError message={monitoring.error} onRetry={monitoring.refresh} />
      ) : null}

      {monitoring.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <UptimeLine
              label="API uptime"
              percent={monitoring.data.uptime.api.uptime_percent}
              observed={monitoring.data.uptime.api.observed_samples}
              expected={monitoring.data.uptime.api.expected_samples}
              coverage={monitoring.data.uptime.api.coverage_percent}
            />
            <UptimeLine
              label="Bot probe uptime"
              percent={monitoring.data.uptime.bot.uptime_percent}
              observed={monitoring.data.uptime.bot.observed_samples}
              expected={monitoring.data.uptime.bot.expected_samples}
              coverage={monitoring.data.uptime.bot.coverage_percent}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartShell
              title="API availability"
              description="One segment per snapshot (60s cadence)."
              meta={`Range: last ${monitoring.data.history_hours}h`}
            >
              <StatusTimeline
                points={serviceTimeline(history, (s) => s.api?.status)}
              />
            </ChartShell>
            <ChartShell
              title="Bot probe availability"
              description="Telegram getMe probe. Disabled means no BOT_TOKEN."
              meta={`Range: last ${monitoring.data.history_hours}h`}
            >
              <StatusTimeline
                points={serviceTimeline(history, (s) => s.bot?.status)}
              />
            </ChartShell>
          </div>

          <ChartShell
            title="API latency"
            description="Recent-request mean and p95 from the process-local rolling buffer."
            meta={`Range: last ${monitoring.data.history_hours}h · times in UTC`}
          >
            <TimeSeriesChart
              points={apiLatencySeries(history).map((p) => ({
                t: p.t,
                values: { mean: p.mean, p95: p.p95 },
              }))}
              series={[
                { key: "mean", label: "Mean", color: "#0ea5e9" },
                { key: "p95", label: "p95", color: "#8b5cf6" },
              ]}
              formatY={(v) => `${Math.round(v)} ms`}
              brush
            />
          </ChartShell>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartShell
              title="API errors in window"
              description="Errors counted in the recent latency window, not a historical request total."
              meta={`Range: last ${monitoring.data.history_hours}h`}
            >
              <BarChart
                points={apiErrorSeries(history).map((p) => ({
                  t: p.t,
                  value: p.errors,
                }))}
                color="#f43f5e"
                formatY={(v) => String(v)}
                brush
              />
            </ChartShell>
            <ChartShell
              title="Bot probe latency"
              description="Shown only for samples with status up."
              meta={`Range: last ${monitoring.data.history_hours}h · times in UTC`}
            >
              <TimeSeriesChart
                points={botLatencySeries(history).map((p) => ({
                  t: p.t,
                  values: { latency: p.latency },
                }))}
                series={[
                  {
                    key: "latency",
                    label: "getMe round trip",
                    color: "#10b981",
                  },
                ]}
                formatY={(v) => `${Math.round(v)} ms`}
                brush
              />
            </ChartShell>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current snapshot</CardDescription>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                API <StatusBadge status={monitoring.data.current.api?.status} />
                Bot <StatusBadge status={monitoring.data.current.bot?.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                API status “up” means the collector could build a snapshot.
                Pair it with an external uptime check against /health for public
                availability claims.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
