"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Clock, Pause, Play, RefreshCw } from "@/lib/icons";
import { useKitsu } from "@/hooks/use-kitsu";
import { Button } from "@/components/ui/button";
import { OptionDropdown } from "@/components/option-dropdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartShell,
  KpiCard,
  PanelError,
  TimeSeriesChart,
  type SeriesPoint,
} from "@/components/charts";
import { AdminState } from "@/components/admin-state";
import {
  alignAnalyticsWindow,
  bucketNumericSeries,
  findCoverageStart,
  formatNumber,
  formatShortDuration,
  formatUtc,
} from "@/lib/kitsu/derive";
import type {
  AdminOverview,
  AlertAnalytics,
  AnalyticsBucket,
  AudienceAnalytics,
  PrometheusData,
  WatchTimeAnalytics,
} from "@/lib/kitsu/types";

const RANGE_PRESETS = [
  { label: "Last 7 days", hours: 168 },
  { label: "Last 30 days", hours: 720 },
  { label: "Last 90 days", hours: 2160 },
] as const;

const BUCKET_OPTIONS = [
  { label: "Daily · DAU", value: "day" },
  { label: "Weekly · WAU", value: "week" },
  { label: "Monthly · MAU", value: "month" },
] as const;

const ACTIVE_LABEL: Record<AnalyticsBucket, string> = {
  day: "Daily active users",
  week: "Weekly active users",
  month: "Monthly active users",
};

const SERIES_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
];

export interface Initial<T> {
  data: T | null;
  error: string | null;
  code?: string | null;
}

interface Props {
  initialRangeHours: number;
  initialBucket: AnalyticsBucket;
  initialWindow: { from: string; to: string };
  initialMetrics: Initial<PrometheusData>;
  initialAdmin: Initial<AdminOverview>;
  initialAudience: Initial<AudienceAnalytics>;
  initialWatch: Initial<WatchTimeAnalytics>;
  initialAlerts: Initial<AlertAnalytics>;
}

function toSeriesPoints<TBucket extends { start: string }>(
  buckets: TBucket[],
  pick: (b: TBucket) => Record<string, number | null>
): SeriesPoint[] {
  return buckets.map((b) => ({ t: b.start, values: pick(b) }));
}

export default function AudienceView({
  initialRangeHours,
  initialBucket,
  initialWindow,
  initialMetrics,
  initialAdmin,
  initialAudience,
  initialWatch,
  initialAlerts,
}: Props) {
  const [rangeHours, setRangeHours] = React.useState(initialRangeHours);
  const [bucket, setBucket] = React.useState<AnalyticsBucket>(initialBucket);
  const [paused, setPaused] = React.useState(false);
  // Pinned to the server-rendered window until the operator changes the
  // range, so first paint never refetches on a millisecond mismatch.
  const [windowOverride, setWindowOverride] = React.useState<{
    from: string;
    to: string;
  } | null>(null);
  const window = windowOverride ?? initialWindow;
  const query = React.useMemo(
    () => ({ from: window.from, to: window.to, bucket }),
    [window, bucket]
  );
  const isInitialWindow =
    window.from === initialWindow.from &&
    window.to === initialWindow.to &&
    bucket === initialBucket;

  const changeRange = (nextHours: number) => {
    setRangeHours(nextHours);
    setWindowOverride(alignAnalyticsWindow(nextHours, bucket));
  };

  const changeBucket = (nextBucket: AnalyticsBucket) => {
    setBucket(nextBucket);
    setWindowOverride(alignAnalyticsWindow(rangeHours, nextBucket));
  };

  const metrics = useKitsu<PrometheusData>("metrics", {
    paused,
    initialData: initialMetrics.data ?? undefined,
    initialError: initialMetrics.error,
  });
  const admin = useKitsu<AdminOverview>("api/admin/overview", {
    paused,
    initialData: initialAdmin.data ?? undefined,
    initialError: initialAdmin.error,
    initialCode: initialAdmin.code,
  });
  const audience = useKitsu<AudienceAnalytics>("api/admin/analytics/audience", {
    query,
    paused,
    initialData: isInitialWindow ? (initialAudience.data ?? undefined) : undefined,
    initialError: isInitialWindow ? initialAudience.error : null,
    initialCode: isInitialWindow ? initialAudience.code : null,
  });
  const watch = useKitsu<WatchTimeAnalytics>("api/admin/analytics/watch-time", {
    query,
    paused,
    initialData: isInitialWindow ? (initialWatch.data ?? undefined) : undefined,
    initialError: isInitialWindow ? initialWatch.error : null,
    initialCode: isInitialWindow ? initialWatch.code : null,
  });
  const alerts = useKitsu<AlertAnalytics>("api/admin/analytics/alerts", {
    query,
    paused,
    initialData: isInitialWindow ? (initialAlerts.data ?? undefined) : undefined,
    initialError: isInitialWindow ? initialAlerts.error : null,
    initialCode: isInitialWindow ? initialAlerts.code : null,
  });

  const refreshAll = () => {
    metrics.refresh();
    admin.refresh();
    audience.refresh();
    watch.refresh();
    alerts.refresh();
  };

  const sessionExpired =
    metrics.sessionExpired ||
    audience.sessionExpired ||
    watch.sessionExpired ||
    alerts.sessionExpired;

  const audienceBuckets = audience.data?.buckets ?? [];
  const activePoints = toSeriesPoints(audienceBuckets, (b) => ({
    active: b.active_users ?? null,
  }));
  const lifecyclePoints = toSeriesPoints(audienceBuckets, (b) => ({
    user_joins: b.user_joins ?? null,
    user_leaves: b.user_leaves ?? null,
    group_joins: b.group_joins ?? null,
    group_leaves: b.group_leaves ?? null,
  }));

  const watchBuckets = watch.data?.buckets ?? [];
  const watchSeries = [
    {
      key: "movie_seconds",
      label: "Movies",
      points: watchBuckets.map((b) => ({
        t: b.start,
        value: b.watch_time_seconds?.movie ?? null,
      })),
    },
    {
      key: "series_seconds",
      label: "Series",
      points: watchBuckets.map((b) => ({
        t: b.start,
        value: b.watch_time_seconds?.series ?? null,
      })),
    },
  ];

  const alertSeries = bucketNumericSeries(alerts.data?.buckets ?? []);

  const coverage =
    findCoverageStart(audience.data?.definitions) ??
    findCoverageStart(watch.data?.definitions) ??
    findCoverageStart(alerts.data?.definitions);
  const rangeMeta = `Buckets: ${bucket} (UTC) · window ${formatUtc(window.from)} → ${formatUtc(window.to)}`;
  const gapNote =
    "Windows align to bucket boundaries and only complete buckets are returned. Missing points mean unavailable coverage, not zero.";

  const basis =
    admin.data?.audience?.users?.active_basis ?? "backend_eligibility_status";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audience</h1>
          <p className="text-sm text-muted-foreground">
            Time-bucketed product analytics from the protected admin API.
            Eligibility counts and DAU/WAU are different things; both are
            shown with their definitions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OptionDropdown
            value={bucket}
            onChange={(v) => changeBucket(v as AnalyticsBucket)}
            label="Bucket size"
            icon={CalendarDays}
            className="w-44"
            options={BUCKET_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <OptionDropdown
            value={String(rangeHours)}
            onChange={(v) => changeRange(Number(v))}
            label="Time range"
            icon={Clock}
            className="w-44"
            options={RANGE_PRESETS.map((o) => ({
              value: String(o.hours),
              label: o.label,
            }))}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {sessionExpired ? (
        <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
          Operator session expired.{" "}
          <Link href="/login" className="underline">
            Sign in again
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total users"
          value={formatNumber(
            admin.data?.audience?.users?.total ?? metrics.data?.usersTotal
          )}
          sub="MongoDB user documents."
        />
        <KpiCard
          label="Active (eligibility)"
          value={formatNumber(
            admin.data?.audience?.users?.active ?? metrics.data?.usersActive
          )}
          sub={`Basis: ${basis}. Not DAU/WAU.`}
        />
        <KpiCard
          label="Total groups"
          value={formatNumber(
            admin.data?.audience?.groups?.total ?? metrics.data?.groupsTotal
          )}
          sub="MongoDB group documents."
        />
        <KpiCard
          label="Active groups"
          value={formatNumber(
            admin.data?.audience?.groups?.active ?? metrics.data?.groupsActive
          )}
          sub="Groups with active status."
        />
      </div>
      {metrics.error && !metrics.data ? (
        <PanelError message={metrics.error} onRetry={metrics.refresh} />
      ) : null}

      <ChartShell
        title={ACTIVE_LABEL[bucket]}
        description="Distinct users with a persisted activity event in each UTC bucket. Event source covers all stored activity event types."
        meta={`${rangeMeta}${coverage ? ` · coverage from ${formatUtc(coverage)}` : ""}`}
        footer={<p className="text-[11px] text-muted-foreground">{gapNote}</p>}
      >
        {audience.data ? (
          <TimeSeriesChart
            points={activePoints}
            series={[{ key: "active", label: ACTIVE_LABEL[bucket], color: "#0ea5e9" }]}
            formatY={(v) => String(Math.round(v))}
            brush
          />
        ) : (
          <AdminState
            code={audience.errorCode}
            error={audience.error}
            onRetry={audience.refresh}
          />
        )}
      </ChartShell>

      <ChartShell
        title="Membership changes"
        description="User and group joins and leaves per bucket, from daily transition counters."
        meta={rangeMeta}
        footer={<p className="text-[11px] text-muted-foreground">{gapNote}</p>}
      >
        {audience.data ? (
          <TimeSeriesChart
            points={lifecyclePoints}
            series={[
              { key: "user_joins", label: "User joins", color: "#10b981" },
              { key: "user_leaves", label: "User leaves", color: "#f43f5e" },
              { key: "group_joins", label: "Group joins", color: "#0ea5e9" },
              { key: "group_leaves", label: "Group leaves", color: "#f59e0b" },
            ]}
            formatY={(v) => String(Math.round(v))}
            brush
          />
        ) : (
          <AdminState
            code={audience.errorCode}
            error={audience.error}
            onRetry={audience.refresh}
          />
        )}
      </ChartShell>

      <ChartShell
        title="Recorded watch time"
        description="Heartbeat-measured playback seconds by media type. Estimated playback time, not unique viewers or completed titles."
        meta={rangeMeta}
        footer={<p className="text-[11px] text-muted-foreground">{gapNote}</p>}
      >
        {watch.data ? (
          <TimeSeriesChart
            points={watch.data.buckets.map((b) => {
              const values: Record<string, number | null> = {};
              for (const s of watchSeries) {
                const hit = s.points.find((p) => p.t === b.start);
                values[s.key] = hit ? hit.value : null;
              }
              return { t: b.start, values };
            })}
            series={watchSeries.map((s, i) => ({
              key: s.key,
              label: s.label,
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))}
            formatY={formatShortDuration}
            brush
          />
        ) : (
          <AdminState
            code={watch.errorCode}
            error={watch.error}
            onRetry={watch.refresh}
          />
        )}
      </ChartShell>

      <ChartShell
        title="Alert audience"
        description="Opted-in alert preference count at each bucket end, independent of account eligibility."
        meta={rangeMeta}
        footer={<p className="text-[11px] text-muted-foreground">{gapNote}</p>}
      >
        {alerts.data ? (
          <TimeSeriesChart
            points={alerts.data.buckets.map((b) => {
              const values: Record<string, number | null> = {};
              for (const s of alertSeries) {
                const hit = s.points.find((p) => p.t === b.start);
                values[s.key] = hit ? hit.value : null;
              }
              return { t: b.start, values };
            })}
            series={alertSeries.map((s, i) => ({
              key: s.key,
              label: s.label,
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))}
            formatY={(v) => String(Math.round(v))}
            brush
          />
        ) : (
          <AdminState
            code={alerts.errorCode}
            error={alerts.error}
            onRetry={alerts.refresh}
          />
        )}
      </ChartShell>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Definitions & limits</CardTitle>
          <CardDescription>Read these before quoting any number.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            <li>
              DAU, WAU, and MAU count distinct users with a persisted activity
              event in the UTC day, Monday-based week, or calendar month.
            </li>
            <li>
              Eligibility and status counts are current flags, not activity.
              Never present them as DAU/WAU.
            </li>
            <li>
              Watch time accumulates on Mini App heartbeats and is
              recorded/estimated playback time, not unique viewers or
              completed titles.
            </li>
            <li>
              Lifecycle counters, watch-time buckets, and alert history begin
              with their reported coverage. Older history is unavailable, not
              zero.
            </li>
            <li>
              Request totals and latency counters are process-local: a restart
              resets them, and multi-instance deployments need scraper-side
              aggregation.
            </li>
          </ul>
          {audience.data?.definitions ? (
            <details className="pt-3 text-xs">
              <summary className="cursor-pointer font-medium text-foreground">
                Backend-reported definitions
              </summary>
              <pre className="no-scrollbar mt-2 overflow-x-auto rounded-md border bg-muted/50 p-3 text-muted-foreground">
                {JSON.stringify(audience.data.definitions, null, 2)}
              </pre>
            </details>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
