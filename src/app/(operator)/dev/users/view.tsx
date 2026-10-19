"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, RefreshCw, Search, Users } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PanelLoading } from "@/components/charts";

type Row = Record<string, unknown>;
type PageResult = { items: Row[]; total: number; has_more: boolean };

function object(value: unknown): Row | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Row
    : null;
}

function list(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(object).filter((item): item is Row => item !== null) : [];
}

function str(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value ? value : fallback;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function dateText(value: unknown): string {
  if (typeof value !== "string") return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { cache: "no-store", signal });
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401) throw new Error("Operator session expired. Sign in again.");
  if (!response.ok) {
    const message = object(body)?.error;
    throw new Error(typeof message === "string" ? message : `Backend responded ${response.status}.`);
  }
  return body as T;
}

export default function UsersView({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = React.useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = React.useState(initialQuery);
  const [users, setUsers] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<Row | null>(null);
  const [referrals, setReferrals] = React.useState<Row[]>([]);
  const [moreReferrals, setMoreReferrals] = React.useState(false);
  const [loadingReferrals, setLoadingReferrals] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [referralError, setReferralError] = React.useState<string | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);

  const searchUsers = React.useCallback(async (term: string) => {
    setSearching(true);
    setSearchError(null);
    setSubmittedQuery(term);
    try {
      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (term.trim()) params.set("q", term.trim());
      const result = await api<PageResult>(`/api/kitsu/api/owner/users?${params}`);
      setUsers(list(result.items));
      setTotal(count(result.total));
      setSelectedId(null);
      setDetail(null);
      setReferrals([]);
      setMoreReferrals(false);
      setLoadingReferrals(false);
      setDetailError(null);
      setReferralError(null);
      const next = new URL(window.location.href);
      if (term.trim()) next.searchParams.set("q", term.trim());
      else next.searchParams.delete("q");
      window.history.replaceState(null, "", next);
    } catch (reason) {
      setSearchError(reason instanceof Error ? reason.message : "User search failed.");
    } finally {
      setSearching(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void searchUsers(initialQuery), 0);
    return () => window.clearTimeout(timer);
  }, [initialQuery, searchUsers]);

  React.useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    const detailRequest = api<Row>(
      `/api/kitsu/api/owner/users/${selectedId}`,
      controller.signal
    ).then((record) => {
      if (!controller.signal.aborted) setDetail(record);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setDetailError(reason instanceof Error ? reason.message : "Could not load this user.");
      }
    });
    const referralRequest = api<PageResult>(
      `/api/kitsu/api/owner/users/${selectedId}/referrals?limit=25&offset=0`,
      controller.signal
    ).then((referralPage) => {
      if (controller.signal.aborted) return;
      setReferrals(list(referralPage.items));
      setMoreReferrals(referralPage.has_more === true);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setReferralError(reason instanceof Error ? reason.message : "Could not load invited users.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingReferrals(false);
    });
    void Promise.all([detailRequest, referralRequest]).finally(() => {
      if (!controller.signal.aborted) setLoadingDetail(false);
    });
    return () => controller.abort();
  }, [selectedId, refresh]);

  async function loadMoreReferrals() {
    if (selectedId === null || !moreReferrals) return;
    setLoadingReferrals(true);
    setReferralError(null);
    try {
      const page = await api<PageResult>(
        `/api/kitsu/api/owner/users/${selectedId}/referrals?limit=25&offset=${referrals.length}`
      );
      setReferrals((current) => current.concat(list(page.items)));
      setMoreReferrals(page.has_more === true);
    } catch (reason) {
      setReferralError(reason instanceof Error ? reason.message : "Could not load more referrals.");
    } finally {
      setLoadingReferrals(false);
    }
  }

  const user = object(detail?.user);
  const watchRequests = object(detail?.watch_requests);
  const referralSummary = object(detail?.referrals);
  const watches = list(detail?.recent_watches);
  const activities = list(detail?.recent_activity);
  const referredBy = object(referralSummary?.referred_by);
  const watchedSeconds = count(user?.watch_sec_movies) + count(user?.watch_sec_series);
  const watchTime = `${Math.floor(watchedSeconds / 3600)}h ${Math.floor((watchedSeconds % 3600) / 60)}m`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Private operator tools</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Users</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Find a Telegram account, inspect its watch activity, and trace who invited whom.
          </p>
        </div>
        <Button variant="outline" onClick={() => { setLoadingDetail(true); setLoadingReferrals(true); setDetailError(null); setReferralError(null); setRefresh((value) => value + 1); }} disabled={selectedId === null || loadingDetail}>
          <RefreshCw className={loadingDetail ? "animate-spin" : ""} />
          Refresh selected
        </Button>
      </header>

      <Card className="rounded-2xl shadow-sm shadow-black/[0.025]">
        <CardHeader>
          <CardTitle>Find a user</CardTitle>
          <CardDescription>Search by Telegram ID, username, or display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void searchUsers(query); }}>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="e.g. 7818848697 or @username" aria-label="Search users" />
            <Button type="submit" disabled={searching} className="sm:min-w-28">
              <Search /> {searching ? "Searching" : "Search"}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{searchError ? <span className="text-destructive">{searchError}</span> : `${total.toLocaleString()} matching accounts`}</span>
            {submittedQuery ? <span>Query: <b className="font-medium text-foreground">{submittedQuery}</b></span> : null}
          </div>
        </CardContent>
      </Card>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
        <Card className="min-w-0 rounded-2xl shadow-sm shadow-black/[0.025]">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Newest activity first · select an account for details.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {searching && users.length === 0 ? <div className="px-4"><PanelLoading lines={4} /></div> : null}
            {!searching && users.length === 0 ? (
              <div className="mx-4 flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
                <Users className="size-5 text-muted-foreground" />
                <p className="text-sm font-medium">No users found</p>
                <p className="text-xs text-muted-foreground">Try a Telegram ID, username, or a shorter name.</p>
              </div>
            ) : null}
            <div className="max-h-[70vh] divide-y overflow-y-auto">
              {users.map((person) => {
                const id = count(person.user_id);
                const active = person.is_active === true && person.banned !== true;
                return (
                  <button key={id} type="button" onClick={() => { if (selectedId === id) { setLoadingDetail(true); setLoadingReferrals(true); setDetailError(null); setReferralError(null); setRefresh((value) => value + 1); return; } setDetail(null); setReferrals([]); setMoreReferrals(false); setLoadingDetail(true); setLoadingReferrals(true); setDetailError(null); setReferralError(null); setSelectedId(id); }} className={`flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${selectedId === id ? "bg-violet-500/10" : ""}`}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-xs font-semibold">{str(person.name, "?").slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{str(person.name, `User ${id}`)}</span>
                      <span className="block truncate text-xs text-muted-foreground">{person.username ? `@${String(person.username)} · ` : ""}{id}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${person.banned === true ? "bg-destructive/10 text-destructive" : active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {person.banned === true ? "Banned" : active ? "Active" : "Inactive"}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0">
          {!selectedId ? (
            <Card className="flex min-h-64 items-center justify-center rounded-2xl border-dashed bg-card/70 text-center shadow-sm shadow-black/[0.025]">
              <CardContent className="flex flex-col items-center gap-2 pt-6">
                <Users className="size-6 text-violet-500" />
                <p className="font-medium">Select an account</p>
                <p className="max-w-sm text-sm text-muted-foreground">Account status, watch history, referral source, and invited users will appear here.</p>
              </CardContent>
            </Card>
          ) : loadingDetail && !user ? (
            <Card className="rounded-2xl p-5"><PanelLoading lines={6} /></Card>
          ) : detailError ? (
            <Card className="rounded-2xl border-destructive/30 p-5 text-sm text-destructive" role="alert">{detailError}</Card>
          ) : user ? (
            <div className="flex min-w-0 flex-col gap-4">
              <Card className="rounded-2xl shadow-sm shadow-black/[0.025]">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-xl">{str(user.name, `User ${selectedId}`)}</CardTitle>
                    <CardDescription className="mt-1">{user.username ? `@${String(user.username)} · ` : ""}Telegram ID {String(user.user_id)}</CardDescription>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{user.banned === true ? "Banned" : user.is_active === true ? "Active" : "Inactive"}</span>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="First seen" value={dateText(user.first_seen)} />
                  <Info label="Last active" value={dateText(user.last_active)} />
                  <Info label="Donor" value={user.is_donor === true ? "Yes" : "No"} />
                  <Info label="Player watch time" value={watchTime} />
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Watch requests" value={count(watchRequests?.total)} sub={`${count(watchRequests?.movies)} movies · ${count(watchRequests?.series)} series`} />
                <Metric label="Invited users" value={count(referralSummary?.total)} sub={`${count(referralSummary?.activated)} started streaming`} />
                <Metric label="Pending first stream" value={count(referralSummary?.pending)} sub="Referred signups not yet activated" />
              </div>

              <Card className="rounded-2xl shadow-sm shadow-black/[0.025]">
                <CardHeader>
                  <CardTitle>Referral path</CardTitle>
                  <CardDescription>Attribution is stored once, when the account first starts Kitsu.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <Info label="Referred by" value={referredBy ? `${str(referredBy.name, `User ${referredBy.user_id}`)}${referredBy.username ? ` (@${String(referredBy.username)})` : ""} · ID ${String(referredBy.user_id)}` : str(user.referral_source, "Direct / not referred")} />
                  <Info label="Referral source" value={str(user.referral_source, "—").replaceAll("_", " ")} />
                  <Info label="Referral date" value={dateText(user.referral_at)} />
                  {referredBy ? <Link className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-300" href={`/dev/users?q=${String(referredBy.user_id)}`}>Open referrer account</Link> : null}
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-2xl shadow-sm shadow-black/[0.025]">
                <CardHeader>
                  <CardTitle>Users invited by this account</CardTitle>
                  <CardDescription>{count(referralSummary?.total).toLocaleString()} total · {count(referralSummary?.activated).toLocaleString()} have started streaming</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingReferrals && referrals.length === 0 ? (
                    <PanelLoading lines={3} />
                  ) : referralError ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 p-4 text-sm text-destructive" role="alert">
                      <p>{referralError}</p>
                      <Button variant="outline" className="w-full" onClick={() => { setLoadingDetail(true); setLoadingReferrals(true); setRefresh((value) => value + 1); }}>Retry referral details</Button>
                    </div>
                  ) : referrals.length ? (
                    <div className="divide-y rounded-xl border">
                      {referrals.map((person) => {
                        const id = count(person.user_id);
                        return (
                          <Link key={id} href={`/dev/users?q=${id}`} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 transition-colors hover:bg-muted/60 sm:px-4">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{str(person.name, `User ${id}`)}</span>
                              <span className="block truncate text-xs text-muted-foreground">{person.username ? `@${String(person.username)} · ` : ""}ID {id} · {dateText(person.first_seen)}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">{str(person.referral_source, "personal").replaceAll("_", " ")}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${person.referral_activated_at ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                              {person.referral_activated_at ? "Streamed" : "Not streamed"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">This user has not referred anyone yet.</p>
                  )}
                  {moreReferrals ? <Button variant="outline" className="mt-3 w-full" disabled={loadingReferrals} onClick={() => void loadMoreReferrals()}>{loadingReferrals ? "Loading" : "Load more referred users"}</Button> : null}
                </CardContent>
              </Card>

              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <Card className="min-w-0 rounded-2xl shadow-sm shadow-black/[0.025]">
                  <CardHeader><CardTitle>Recent watches</CardTitle><CardDescription>Resume activity recorded by the player.</CardDescription></CardHeader>
                  <CardContent>
                    {watches.length ? <div className="divide-y rounded-xl border">{watches.slice(0, 8).map((watch, index) => <div key={`${String(watch.imdb)}-${String(watch.episode)}-${index}`} className="flex items-start gap-3 px-3 py-3"><Activity className="mt-0.5 size-4 shrink-0 text-violet-500" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{str(watch.title)}</span><span className="block text-xs text-muted-foreground">{str(watch.media_type)}{watch.episode ? ` · S${String(watch.season)} E${String(watch.episode)}` : ""} · {dateText(watch.updated_at)}</span></span></div>)}</div> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No player resume points recorded.</p>}
                  </CardContent>
                </Card>
                <Card className="min-w-0 rounded-2xl shadow-sm shadow-black/[0.025]">
                  <CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Latest bot account events.</CardDescription></CardHeader>
                  <CardContent>
                    {activities.length ? <div className="divide-y rounded-xl border">{activities.slice(0, 8).map((activity, index) => <div key={`${String(activity.event_type)}-${index}`} className="flex items-center justify-between gap-3 px-3 py-3"><span className="truncate text-sm font-medium">{str(activity.event_type).replaceAll("_", " ")}</span><span className="shrink-0 text-xs text-muted-foreground">{dateText(activity.timestamp)}</span></div>)}</div> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No activity events recorded.</p>}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border bg-background/60 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>;
}

function Metric({ label, value, sub }: { label: string; value: number; sub: string }) {
  return <Card className="rounded-2xl shadow-sm shadow-black/[0.025]"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{sub}</p></CardContent></Card>;
}
