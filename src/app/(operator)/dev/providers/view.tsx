"use client";

import * as React from "react";
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
  ChartShell,
  PanelEmpty,
  PanelError,
  TimeSeriesChart,
} from "@/components/charts";
import { StatusBadge } from "@/components/status";
import {
  computeTransitions,
  formatAgo,
  formatNumber,
  formatPercent,
  formatUtc,
  providerLatencySeries,
} from "@/lib/kitsu/derive";
import type {
  MonitoringResponse,
  ProviderInfo,
  ProviderSample,
  ServersResponse,
} from "@/lib/kitsu/types";

const SERIES_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

export default function ProvidersView({
  initialHours,
  initialMonitoring,
  initialServers,
}: {
  initialHours: number;
  initialMonitoring: {
    data: MonitoringResponse | null;
    error: string | null;
  };
  initialServers: {
    data: ServersResponse | null;
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
  const servers = useKitsu<ServersResponse>("api/servers", {
    paused,
    initialData: initialServers.data ?? undefined,
    initialError: initialServers.error,
    initialAt: fetchedAt,
  });

  const refreshAll = () => {
    monitoring.refresh();
    servers.refresh();
  };

  const history = React.useMemo(
    () => monitoring.data?.history ?? [],
    [monitoring.data]
  );
  const names = React.useMemo(() => {
    const set = new Set<string>();
    for (const snap of history) {
      for (const name of Object.keys(snap.servers ?? {})) set.add(name);
    }
    return [...set].sort();
  }, [history]);

  // Prefer server-computed transitions from the full pre-decimation
  // history; fall back to the (possibly decimated) payload in view.
  const changes = React.useMemo(
    () =>
      (
        monitoring.data?.transitions ?? computeTransitions(history, names)
      ).slice(0, 30),
    [monitoring.data, history, names]
  );

  const listing = React.useMemo(() => {
    const map = new Map<string, ProviderInfo>();
    for (const s of servers.data?.servers ?? []) map.set(s.name, s);
    return map;
  }, [servers.data]);

  const rows = names
    .map((name) => {
      const sample: ProviderSample | undefined =
        monitoring.data?.current.servers?.[name];
      const uptime = monitoring.data?.uptime.servers?.[name];
      return { name, sample, uptime, info: listing.get(name) };
    })
    .sort((a, b) => {
      const rank = (s: string | null | undefined) =>
        s === "down" ? 0 : s === null || s === undefined ? 1 : 2;
      return rank(a.sample?.status) - rank(b.sample?.status);
    });

  const latencyPoints = React.useMemo(() => {
    if (history.length === 0) return [];
    return history.map((snap) => {
      const values: Record<string, number | null> = {};
      const stale: Record<string, boolean> = {};
      for (const name of names) {
        const series = providerLatencySeries([snap], name)[0];
        values[name] = series?.latency ?? null;
        stale[name] = series?.stale ?? false;
      }
      return { t: snap.timestamp, values, stale };
    });
  }, [history, names]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
          <p className="text-sm text-muted-foreground">
            Resolve-health per provider (real reference-title probes), plus the
            live provider listing. A failed probe is shown as-is. It is not
            proof a viewer cannot reach the source.
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
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Provider inventory</CardDescription>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <StatusBadge
                  status={monitoring.data.current.server_inventory_status}
                />
                <span className="text-sm font-normal text-muted-foreground">
                  probed {formatAgo(monitoring.data.current.server_probe_at)} ·
                  inventory refreshes every ~10 min and is reused between
                  probes
                </span>
              </CardTitle>
            </CardHeader>
            {servers.error && !servers.data ? (
              <CardContent>
                <PanelError
                  message={`Live listing unavailable: ${servers.error}`}
                  onRetry={servers.refresh}
                />
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider status</CardTitle>
              <CardDescription>
                Health sample, latency, last probe error, and uptime with
                coverage. Stale samples are reused inventory values, not fresh
                probes.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Provider</th>
                    <th className="py-2 pr-4 font-medium">Health</th>
                    <th className="py-2 pr-4 font-medium">Latency</th>
                    <th className="py-2 pr-4 font-medium">Last error</th>
                    <th className="py-2 pr-4 font-medium">Uptime</th>
                    <th className="py-2 font-medium">Listing</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ name, sample, uptime, info }) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{name}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge
                          status={sample?.status}
                          stale={sample?.stale}
                        />
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {sample?.latency_ms === null ||
                        sample?.latency_ms === undefined
                          ? "—"
                          : `${Math.round(sample.latency_ms)} ms`}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {sample?.error ?? "—"}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {formatPercent(uptime?.uptime_percent)}{" "}
                        <span className="text-muted-foreground">
                          ({formatNumber(uptime?.observed_samples)} obs ·{" "}
                          {formatPercent(uptime?.coverage_percent)} cov)
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {info ? (
                          <>
                            {info.disabled === true ? "disabled · " : ""}
                            {(info.protocols ?? []).join("/") || "—"}
                            {info["4k"] === true ? " · 4K" : ""}
                            {info.description ? ` · ${info.description}` : ""}
                          </>
                        ) : (
                          "not in live listing"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <ChartShell
            title="Provider latency"
            description="Per-provider resolve latency. Amber dots mark stale reuses, not fresh probes. Drag the brush to zoom; click a series to hide it."
            meta={`Range: last ${monitoring.data.history_hours}h · times in UTC · gaps are missing samples`}
          >
            <TimeSeriesChart
              points={latencyPoints}
              series={names.map((name, i) => ({
                key: name,
                label: name,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
                markStale: true,
              }))}
              formatY={(v) => `${Math.round(v)} ms`}
              brush
            />
          </ChartShell>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent state changes</CardTitle>
              <CardDescription>
                Health transitions in the selected range (latest first, up to
                30).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <PanelEmpty
                  title="No transitions"
                  detail="No provider changed health state in this range."
                />
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {changes.map((c, i) => (
                    <li key={`${c.t}-${c.name}-${i}`} className="flex flex-wrap items-center gap-2">
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
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
