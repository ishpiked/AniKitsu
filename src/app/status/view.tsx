"use client";

import * as React from "react";
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
  ChartShell,
  PanelError,
  StatusTimeline,
  TimeSeriesChart,
} from "@/components/charts";
import { StatusBadge } from "@/components/status";
import {
  formatAgo,
  formatDuration,
  formatMs,
  formatNumber,
  formatPercent,
  formatUtc,
  toTimelineStatus,
} from "@/lib/kitsu/derive";
import type { OverallState, PublicStatus } from "@/lib/kitsu/types";
import { cn } from "cn";

const stateClass: Record<OverallState, string> = {
  operational: "border-emerald-500/50",
  degraded: "border-amber-500/50",
  down: "border-red-500/60",
  unknown: "border-dashed",
};

const stateLabel: Record<OverallState, string> = {
  operational: "All systems operational",
  degraded: "Partial degradation",
  down: "Service disruption",
  unknown: "Status unknown",
};

export default function StatusView({
  initialHours,
  initialStatus,
}: {
  initialHours: number;
  initialStatus: {
    data: PublicStatus | null;
    error: string | null;
  };
}) {
  const generated = initialStatus.data?.generated_at;
  const generatedMs = generated ? Date.parse(generated) : NaN;
  const fetchedAt = Number.isFinite(generatedMs) ? generatedMs : null;
  const { hours, setHours, paused, setPaused } =
    useDashboardControls(initialHours);
  const status = useKitsu<PublicStatus>("status", {
    base: "/api/public",
    hours,
    paused,
    refreshMs: 60000,
    initialData: initialStatus.data ?? undefined,
    initialError: initialStatus.error,
    initialAt: fetchedAt,
  });

  const data = status.data;
  const downProviders =
    data?.providers.filter((p) => p.status === "down") ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1 pt-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          Service status
        </h1>
        <p className="text-sm text-muted-foreground">
          Public status page.{" "}
          {data
            ? `Sampled ${formatAgo(data.probe_at ?? data.generated_at)}. Times in UTC.`
            : "Waiting for the first snapshot."}
        </p>
      </div>

      <RefreshControls
        hours={hours}
        onHours={setHours}
        paused={paused}
        onPaused={setPaused}
        onRefresh={status.refresh}
        updatedAt={status.updatedAt}
        live={status.error === null}
      />

      {status.error && !data ? (
        <PanelError message={status.error} onRetry={status.refresh} />
      ) : null}

      {data ? (
        <>
          <Card className={cn("border-2", stateClass[data.verdict.state])}>
            <CardHeader className="pb-2">
              <CardDescription>Current status</CardDescription>
              <CardTitle className="text-2xl">
                {stateLabel[data.verdict.state]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {data.verdict.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {status.error ? (
                <p className="pt-2 text-sm text-amber-600 dark:text-amber-400">
                  Showing the last good snapshot; the latest refresh failed:{" "}
                  {status.error}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>API</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StatusBadge status={data.api.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <p>
                  Latency:{" "}
                  <strong className="tabular-nums">
                    {formatMs(data.api.latency_ms)}
                  </strong>{" "}
                  · p95{" "}
                  <strong className="tabular-nums">
                    {formatMs(data.api.p95_latency_ms)}
                  </strong>
                </p>
                <p>
                  Uptime:{" "}
                  <strong className="tabular-nums">
                    {formatPercent(data.api.uptime.uptime_percent)}
                  </strong>{" "}
                  <span className="text-muted-foreground">
                    ({formatNumber(data.api.uptime.observed_samples)}{" "}
                    observed ·{" "}
                    {formatPercent(data.api.uptime.coverage_percent)} coverage)
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Process uptime {formatDuration(data.api.uptime_seconds)}.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Telegram bot</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StatusBadge status={data.bot.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <p>
                  Probe:{" "}
                  <strong className="tabular-nums">
                    {formatMs(data.bot.latency_ms)}
                  </strong>
                </p>
                <p>
                  Uptime:{" "}
                  <strong className="tabular-nums">
                    {formatPercent(data.bot.uptime.uptime_percent)}
                  </strong>{" "}
                  <span className="text-muted-foreground">
                    ({formatPercent(data.bot.uptime.coverage_percent)}{" "}
                    coverage)
                  </span>
                </p>
                {data.bot.status === "disabled" ? (
                  <p className="text-muted-foreground">
                    The bot is not configured right now.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Stream providers</CardDescription>
                <CardTitle className="text-lg tabular-nums">
                  {data.providers.filter((p) => p.status === "up").length}/
                  {data.providers.length} up
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <p>
                  Inventory: <StatusBadge status={data.inventory_status} />{" "}
                  <span className="text-muted-foreground">
                    probed {formatAgo(data.probe_at)}
                  </span>
                </p>
                {downProviders.length > 0 ? (
                  <p className="text-muted-foreground">
                    Down: {downProviders.map((p) => p.name).join(", ")}.
                    Availability depends on upstream services.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No provider outages detected in the latest probe.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <ChartShell
            title="API latency"
            description="Mean vs p95 of recent requests."
            meta={`Range: last ${data.history_hours}h · times in UTC`}
          >
            <TimeSeriesChart
              points={data.history.map((h) => ({
                t: h.t,
                values: {
                  mean: h.api.latency_ms,
                  p95: h.api.p95_latency_ms,
                },
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
              title="API availability"
              meta={`Range: last ${data.history_hours}h`}
            >
              <StatusTimeline
                points={data.history.map((h) => ({
                  t: h.t,
                  status: toTimelineStatus(h.api.status),
                }))}
              />
            </ChartShell>
            <ChartShell
              title="Bot availability"
              meta={`Range: last ${data.history_hours}h`}
            >
              <StatusTimeline
                points={data.history.map((h) => ({
                  t: h.t,
                  status: toTimelineStatus(h.bot.status),
                }))}
              />
            </ChartShell>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Providers</CardTitle>
              <CardDescription>
                Latest probe per provider. Stale entries reuse the previous
                probe result.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Provider</th>
                    <th className="py-2 pr-4 font-medium">Health</th>
                    <th className="py-2 pr-4 font-medium">Latency</th>
                    <th className="py-2 font-medium">Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.providers]
                    .sort((a, b) =>
                      a.status === b.status
                        ? a.name.localeCompare(b.name)
                        : a.status === "down"
                          ? -1
                          : 1
                    )
                    .map((p) => (
                      <tr key={p.name} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{p.name}</td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={p.status} stale={p.stale} />
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {p.latency_ms === null ? "—" : `${Math.round(p.latency_ms)} ms`}
                        </td>
                        <td className="py-2 tabular-nums">
                          {formatPercent(p.uptime_percent)}{" "}
                          <span className="text-muted-foreground">
                            ({formatPercent(p.coverage_percent)} coverage)
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {data.transitions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent changes</CardTitle>
                <CardDescription>
                  Provider health transitions in range (latest first).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {data.transitions.slice(0, 20).map((c, i) => (
                    <li
                      key={`${c.t}-${c.name}-${i}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="tabular-nums text-muted-foreground">
                        {formatUtc(c.t)}
                      </span>
                      <strong>{c.name}</strong>
                      <StatusBadge status={c.from} />
                      <span aria-hidden>→</span>
                      <StatusBadge status={c.to} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Generated {formatUtc(data.generated_at)} · snapshots every{" "}
            {data.sample_interval_seconds}s
            {data.effective_interval_seconds > data.sample_interval_seconds
              ? ` (decimated to ~${data.effective_interval_seconds}s for display)`
              : ""}
            {data.persistent_history
              ? " · history is persistent."
              : " · history is memory-only and resets on backend restart."}
          </p>
        </>
      ) : null}
    </div>
  );
}
