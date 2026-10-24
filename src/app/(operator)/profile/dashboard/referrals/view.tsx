"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, Users } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard, PanelError, PanelLoading } from "@/components/charts";

type ReferralData = {
  days: number;
  totals: {
    signups: number;
    activated: number;
    pending: number;
    conversion_percent: number;
  };
  sources: { id: string; users: number; activated: number }[];
  daily: { id: string; users: number; activated: number }[];
  top_referrers: {
    user_id: number;
    name?: string;
    username?: string;
    referrals: number;
    activated: number;
  }[];
};

async function readReferralData(signal: AbortSignal): Promise<ReferralData> {
  const response = await fetch(
    "/api/kitsu/api/owner/referrals?days=30&limit=20",
    { cache: "no-store", signal }
  );
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401) throw new Error("Operator session expired. Sign in again.");
  if (!response.ok || !body || typeof body !== "object") {
    const error = body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : `Backend responded ${response.status}.`;
    throw new Error(error);
  }
  return body as ReferralData;
}

export default function ReferralView() {
  const [data, setData] = React.useState<ReferralData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refresh, setRefresh] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    readReferralData(controller.signal)
      .then((next) => {
        setData(next);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Could not load referral data.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  const maxDaily = Math.max(1, ...(data?.daily.map((day) => day.users) ?? [1]));
  const reload = () => {
    setLoading(true);
    setRefresh((value) => value + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Community growth</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Referrals</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            First-time joins, first streams, campaign sources, and the people bringing new viewers to Kitsu.
          </p>
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>

      {error ? <PanelError message={error} onRetry={reload} /> : null}
      {loading && !data ? <PanelLoading lines={4} /> : null}
      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Referral totals">
            <KpiCard label="New users referred" value={data.totals.signups.toLocaleString()} sub="All recorded referral links" />
            <KpiCard label="Started a stream" value={data.totals.activated.toLocaleString()} sub="At least one valid player heartbeat" />
            <KpiCard label="Not streamed yet" value={data.totals.pending.toLocaleString()} sub="Joined through a link, no first stream yet" />
            <KpiCard label="First-stream rate" value={`${data.totals.conversion_percent}%`} sub="Referred users who began playback" />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <Card className="rounded-2xl shadow-sm shadow-black/[0.025]">
              <CardHeader>
                <CardTitle>Daily referral joins</CardTitle>
                <CardDescription>Last {data.days} days · activation appears as the darker overlay.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.daily.length ? (
                  <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 lg:grid-cols-15">
                    {data.daily.map((day) => (
                      <div key={day.id} className="flex min-w-0 flex-col items-center gap-1.5" title={`${day.id}: ${day.users} joined, ${day.activated} streamed`}>
                        <div className="flex h-28 w-full items-end justify-center rounded-lg bg-muted/50 p-1">
                          <div className="relative w-full overflow-hidden rounded-md bg-violet-500/25" style={{ height: `${Math.max(4, (day.users / maxDaily) * 100)}%` }}>
                            <div className="absolute inset-x-0 bottom-0 bg-violet-600/80" style={{ height: `${day.users ? (day.activated / day.users) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{day.id.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Referral activity will appear here as people join through invite links.
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-violet-500/30" /> Joined</span>
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-violet-700/80" /> First stream</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm shadow-black/[0.025]">
              <CardHeader>
                <CardTitle>Link sources</CardTitle>
                <CardDescription>Personal invite links and channel Creator Kit links.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {data.sources.length ? data.sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{source.id === "creator_kit" ? "Creator Kit" : "Personal links"}</p>
                      <p className="text-xs text-muted-foreground">{source.activated} of {source.users} began streaming</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-violet-700 dark:text-violet-300">{source.users}</span>
                  </div>
                )) : (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No referral links have been used yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="rounded-2xl shadow-sm shadow-black/[0.025]">
            <CardHeader>
              <CardTitle>Top referrers</CardTitle>
              <CardDescription>Open a person in Users to inspect their account and invited members.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.top_referrers.length ? (
                <div className="divide-y rounded-xl border">
                  {data.top_referrers.map((person, index) => (
                    <Link key={person.user_id} href={`/profile/dashboard/users?q=${person.user_id}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/60 sm:px-4">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-xs font-semibold text-violet-600">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{person.name || person.username || `User ${person.user_id}`}</span>
                        <span className="block truncate text-xs text-muted-foreground">{person.username ? `@${person.username} · ` : ""}ID {person.user_id}</span>
                      </span>
                      <span className="hidden text-right text-xs text-muted-foreground sm:block">{person.activated} streamed</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{person.referrals}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
                  <Users className="size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">No referrals yet</p>
                  <p className="max-w-md text-xs text-muted-foreground">Personal links and channel Creator Kit links will show here after a new user starts the bot from one.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
