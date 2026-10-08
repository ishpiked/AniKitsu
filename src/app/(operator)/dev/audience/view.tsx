"use client";

import * as React from "react";
import Link from "next/link";
import { Pause, Play, RefreshCw } from "@/lib/icons";
import { useKitsu } from "@/hooks/use-kitsu";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  PanelLoading,
  TimeSeriesChart,
} from "@/components/charts";
import {
  alignAnalyticsWindow,
  formatNumber,
  formatPercent,
  formatUtc,
} from "@/lib/kitsu/derive";
import type {
  AdminOverview,
  PrometheusData,
} from "@/lib/kitsu/types";

const RANGE_PRESETS = [
  { label: "Last 7 days", hours: 168 },
  { label: "Last 30 days", hours: 720 },
  { label: "Last 90 days", hours: 2160 },
] as const;

export interface Initial<T> {
  data: T | null;
  error: string | null;
  code?: string | null;
}

interface Props {
  initialRangeHours: number;
  initialWindow: { from: string; to: string };
  initialMetrics: Initial<PrometheusData>;
  initialAdmin: Initial<AdminOverview>;
}

const PAGE_LIMIT = 200;
const MAX_PAGES = 25;

function recordBody(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function dayKey(time: number): string {
  const d = new Date(time);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function fetchRecordPage(
  kind: "users" | "groups",
  offset: number,
  signal: AbortSignal
): Promise<{ items: Record<string, unknown>[]; total: number | null }> {
  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT),
    offset: String(offset),
  });
  const response = await fetch(`/api/kitsu/api/owner/${kind}?${params}`, {
    cache: "no-store",
    signal,
  });
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Backend returned an unreadable response (${response.status}).`);
  }
  if (response.status === 401) {
    const err = new Error("Operator session expired. Sign in again.");
    err.name = "SessionExpiredError";
    throw err;
  }
  if (!response.ok) {
    const body = recordBody(result);
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Backend responded ${response.status}.`
    );
  }
  const body = recordBody(result);
  const items = body && Array.isArray(body.items) ? body.items : [];
  return {
    items: items
      .map(recordBody)
      .filter((item): item is Record<string, unknown> => item !== null),
    total: body && typeof body.total === "number" ? body.total : null,
  };
}

async function fetchAllRecords(
  kind: "users" | "groups",
  signal: AbortSignal
): Promise<Record<string, unknown>[]> {
  const first = await fetchRecordPage(kind, 0, signal);
  const pages = Math.min(
    MAX_PAGES,
    Math.ceil((first.total ?? first.items.length) / PAGE_LIMIT)
  );
  if (pages <= 1) return first.items;
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      fetchRecordPage(kind, (i + 1) * PAGE_LIMIT, signal)
    )
  );
  return first.items.concat(rest.flatMap((page) => page.items));
}

export interface TrendDay {
  t: string;
  active: number;
  userJoins: number;
  userLeaves: number;
  groupJoins: number;
  groupLeaves: number;
}

export interface RecordTrends {
  from: string;
  to: string;
  days: TrendDay[];
  alertOptIns: number;
  userTotal: number;
}

function bucketDay(
  counts: Map<string, number>,
  item: Record<string, unknown>,
  dateKey: string,
  fromMs: number,
  toMs: number
): void {
  const raw = typeof item[dateKey] === "string" ? item[dateKey] : null;
  if (!raw) return;
  const time = Date.parse(raw);
  if (!Number.isFinite(time) || time < fromMs || time >= toMs) return;
  const key = dayKey(time);
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * Audience trends derived from account records instead of the analytics
 * pipeline (whose lifecycle counters have no historical coverage): active
 * users per day of last activity, exact joins/leaves from first_seen,
 * left_at, added_at, removed_at, and the current alert opt-in count.
 */
function useRecordTrends(rangeHours: number, paused: boolean) {
  const [data, setData] = React.useState<RecordTrends | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sessionExpired, setSessionExpired] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      try {
        const window = alignAnalyticsWindow(rangeHours, "day");
        const fromMs = Date.parse(window.from);
        const toMs = Date.parse(window.to);
        const [users, groups] = await Promise.all([
          fetchAllRecords("users", controller.signal),
          fetchAllRecords("groups", controller.signal),
        ]);
        if (cancelled) return;
        const active = new Map<string, number>();
        const userJoins = new Map<string, number>();
        const userLeaves = new Map<string, number>();
        const groupJoins = new Map<string, number>();
        const groupLeaves = new Map<string, number>();
        let alertOptIns = 0;
        for (const item of users) {
          bucketDay(active, item, "last_active", fromMs, toMs);
          bucketDay(userJoins, item, "first_seen", fromMs, toMs);
          bucketDay(userLeaves, item, "left_at", fromMs, toMs);
          if (item.alerts_on === true) alertOptIns += 1;
        }
        for (const item of groups) {
          bucketDay(groupJoins, item, "added_at", fromMs, toMs);
          bucketDay(groupLeaves, item, "removed_at", fromMs, toMs);
        }
        const days: TrendDay[] = [];
        for (
          let cursor = Math.floor(fromMs / 86_400_000) * 86_400_000;
          cursor < toMs;
          cursor += 86_400_000
        ) {
          const key = dayKey(cursor);
          days.push({
            t: new Date(cursor).toISOString(),
            active: active.get(key) ?? 0,
            userJoins: userJoins.get(key) ?? 0,
            userLeaves: userLeaves.get(key) ?? 0,
            groupJoins: groupJoins.get(key) ?? 0,
            groupLeaves: groupLeaves.get(key) ?? 0,
          });
        }
        setData({
          from: window.from,
          to: window.to,
          days,
          alertOptIns,
          userTotal: users.length,
        });
        setError(null);
        setSessionExpired(false);
        setLoading(false);
      } catch (reason) {
        if (cancelled) return;
        if (reason instanceof Error && reason.name === "AbortError") return;
        if (reason instanceof Error && reason.name === "SessionExpiredError") {
          setSessionExpired(true);
        }
        setError(
          reason instanceof Error ? reason.message : "Could not load audience trends."
        );
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rangeHours, tick]);

  React.useEffect(() => {
    if (paused) return;
    const id = window.setInterval(refresh, 45000);
    return () => window.clearInterval(id);
  }, [paused, refresh]);

  return { data, error, loading, sessionExpired, refresh };
}

export default function AudienceView({
  initialRangeHours,
  initialWindow,
  initialMetrics,
  initialAdmin,
}: Props) {
  const [rangeHours, setRangeHours] = React.useState(initialRangeHours);
  const [paused, setPaused] = React.useState(false);
  // Pinned to the server-rendered window until the operator changes the
  // range, so first paint never refetches on a millisecond mismatch.
  const [windowOverride, setWindowOverride] = React.useState<{
    from: string;
    to: string;
  } | null>(null);
  const window = windowOverride ?? initialWindow;

  const changeRange = (nextHours: number) => {
    setRangeHours(nextHours);
    setWindowOverride(alignAnalyticsWindow(nextHours, "day"));
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
  const trends = useRecordTrends(rangeHours, paused);

  const refreshAll = () => {
    metrics.refresh();
    admin.refresh();
    trends.refresh();
  };

  const sessionExpired =
    metrics.sessionExpired || trends.sessionExpired;

  const rangeMeta = `Last ${Math.round(rangeHours / 24)} days · day buckets (UTC) · window ${formatUtc(window.from)} → ${formatUtc(window.to)}`;
  const gapNote =
    "Only complete days are counted. A user active on many days counts once, on the day of their latest activity.";

  const basis =
    admin.data?.audience?.users?.active_basis ?? "backend_eligibility_status";
  const alertShare =
    trends.data && trends.data.userTotal > 0
      ? (trends.data.alertOptIns / trends.data.userTotal) * 100
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audience</h1>
          <p className="text-sm text-muted-foreground">
            Community trends counted from account records. Eligibility counts
            are current flags, not activity; both are shown with their
            definitions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(rangeHours)} onValueChange={(v: string) => changeRange(Number(v))}>
            <SelectTrigger className="w-44" aria-label="Time range">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_PRESETS.map((o) => (
                <SelectItem key={String(o.hours)} value={String(o.hours)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          sub={`Basis: ${basis}. Not daily activity.`}
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
        <KpiCard
          label="Alert opt-ins"
          value={trends.data ? String(trends.data.alertOptIns) : "—"}
          sub="Users with title alerts on, right now."
        />
        <KpiCard
          label="Opt-in share"
          value={alertShare === null ? "—" : formatPercent(alertShare)}
          sub="Opted-in users of all fetched users."
        />
      </div>
      {metrics.error && !metrics.data ? (
        <PanelError message={metrics.error} onRetry={metrics.refresh} />
      ) : null}

      <ChartShell
        title="Active users"
        description="Users grouped by day of last recorded activity. A user active on many days counts once, on their latest day."
        meta={rangeMeta}
        footer={<p className="text-[11px] text-muted-foreground">{gapNote}</p>}
      >
        {trends.data ? (
          <TimeSeriesChart
            points={trends.data.days.map((d) => ({
              t: d.t,
              values: { active: d.active },
            }))}
            series={[{ key: "active", label: "Active users", color: "#0ea5e9" }]}
            formatY={(v) => String(Math.round(v))}
            tickMode="date"
            brush
          />
        ) : trends.loading ? (
          <PanelLoading lines={3} />
        ) : (
          <PanelError
            message={trends.error ?? "Audience trends are unavailable."}
            onRetry={trends.refresh}
          />
        )}
      </ChartShell>

      <ChartShell
        title="Membership changes"
        description="Joins and leaves per day, from first-seen and removal timestamps on account records."
        meta={rangeMeta}
        footer={<p className="text-[11px] text-muted-foreground">{gapNote}</p>}
      >
        {trends.data ? (
          <TimeSeriesChart
            points={trends.data.days.map((d) => ({
              t: d.t,
              values: {
                user_joins: d.userJoins,
                user_leaves: d.userLeaves,
                group_joins: d.groupJoins,
                group_leaves: d.groupLeaves,
              },
            }))}
            series={[
              { key: "user_joins", label: "User joins", color: "#10b981" },
              { key: "user_leaves", label: "User leaves", color: "#f43f5e" },
              { key: "group_joins", label: "Group joins", color: "#0ea5e9" },
              { key: "group_leaves", label: "Group leaves", color: "#f59e0b" },
            ]}
            formatY={(v) => String(Math.round(v))}
            tickMode="date"
            brush
          />
        ) : trends.loading ? (
          <PanelLoading lines={3} />
        ) : (
          <PanelError
            message={trends.error ?? "Audience trends are unavailable."}
            onRetry={trends.refresh}
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
              Active users groups each account by the UTC day of its last
              recorded activity. It understates repeat activity: a user
              active every day counts once.
            </li>
            <li>
              Joins come from first-seen (users) and added-at (groups)
              timestamps and are exact. Leaves come from removal timestamps
              where the backend records them.
            </li>
            <li>
              Eligibility and status counts are current flags, not activity.
              Never present them as daily actives.
            </li>
            <li>
              Alert opt-ins is a current snapshot of the alerts-on flag, not
              a history.
            </li>
            <li>
              Request totals and latency counters are process-local: a restart
              resets them, and multi-instance deployments need scraper-side
              aggregation.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
