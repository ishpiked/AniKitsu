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
import { KpiCard, PanelEmpty, PanelError } from "@/components/charts";
import { formatAgo, formatNumber } from "@/lib/kitsu/derive";
import type { PrometheusData } from "@/lib/kitsu/types";

export default function AudienceView({
  initialHours,
  initialMetrics,
}: {
  initialHours: number;
  initialMetrics: {
    data: PrometheusData | null;
    error: string | null;
  };
}) {
  const scraped = initialMetrics.data?.scrapedAt;
  const scrapedMs = scraped ? Date.parse(scraped) : NaN;
  const fetchedAt = Number.isFinite(scrapedMs) ? scrapedMs : null;
  const { hours, setHours, paused, setPaused } =
    useDashboardControls(initialHours);
  const metrics = useKitsu<PrometheusData>("metrics", {
    paused,
    initialData: initialMetrics.data ?? undefined,
    initialError: initialMetrics.error,
    initialAt: fetchedAt,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audience</h1>
          <p className="text-sm text-muted-foreground">
            Current audience size from Prometheus gauges
            {metrics.data
              ? `, scraped ${formatAgo(metrics.data.scrapedAt)}.`
              : "."}{" "}
            Historical trends need backend aggregation first.
          </p>
        </div>
        <RefreshControls
          hours={hours}
          onHours={setHours}
          paused={paused}
          onPaused={setPaused}
          onRefresh={metrics.refresh}
          updatedAt={metrics.updatedAt}
          live={metrics.error === null}
        />
      </div>

      {metrics.sessionExpired ? (
        <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
          Operator session expired.{" "}
          <Link href="/login" className="underline">
            Sign in again
          </Link>
          .
        </p>
      ) : null}
      {metrics.error && !metrics.data ? (
        <PanelError message={metrics.error} onRetry={metrics.refresh} />
      ) : null}

      {metrics.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total users"
              value={formatNumber(metrics.data.usersTotal)}
              sub="MongoDB user documents."
            />
            <KpiCard
              label="Active eligible users"
              value={formatNumber(metrics.data.usersActive)}
              sub="Backend-defined eligibility."
            />
            <KpiCard
              label="Total groups"
              value={formatNumber(metrics.data.groupsTotal)}
              sub="MongoDB group documents."
            />
            <KpiCard
              label="Active groups"
              value={formatNumber(metrics.data.groupsActive)}
              sub="Groups with active status."
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Definitions & limits</CardTitle>
              <CardDescription>
                Read these before quoting any number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                <li>
                  “Active” follows the backend&apos;s eligibility/status flags,
                  not a stated DAU/WAU event definition.
                </li>
                <li>
                  Watch time accumulates on Mini App heartbeats and is
                  recorded/estimated playback time, not unique viewers or
                  completed titles.
                </li>
                <li>
                  Counters are process-local: a restart resets request totals
                  and a multi-instance deployment needs scraper-side
                  aggregation.
                </li>
                <li>
                  Daily/weekly active users, joins/leaves, watch-time splits,
                  and the alert audience need purpose-built, time-bucketed
                  backend endpoints (e.g. /api/admin/v1/analytics/…) with an
                  explicit UTC definition of “active”.
                </li>
              </ul>
            </CardContent>
          </Card>

          <PanelEmpty
            title="No audience trends yet"
            detail="The backend exposes current user/group counts but no historical audience series. Trends, DAU/WAU, and watch-time splits will appear here once aggregation endpoints land."
          />
        </>
      ) : null}
    </div>
  );
}
