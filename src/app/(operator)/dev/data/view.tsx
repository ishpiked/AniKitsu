"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Dataset =
  | "overview"
  | "users"
  | "watch-history"
  | "groups"
  | "schedules"
  | "activity"
  | "usage"
  | "watchers";

const datasets: { id: Dataset; label: string; searchable?: boolean }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users", searchable: true },
  { id: "watch-history", label: "Watch history", searchable: true },
  { id: "groups", label: "Groups" },
  { id: "schedules", label: "Schedules" },
  { id: "activity", label: "Activity" },
  { id: "usage", label: "Usage analytics" },
  { id: "watchers", label: "Watch-time leaders" },
];

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function itemId(item: Record<string, unknown>, dataset: Dataset): string | null {
  const id = dataset === "groups" ? item.chat_id : item.user_id;
  return typeof id === "number" || typeof id === "string" ? String(id) : null;
}

function requestPath(
  dataset: Dataset,
  query: string,
  offset: number
): string {
  if (dataset === "overview") return "/api/kitsu/api/owner/overview";
  if (dataset === "usage") return "/api/kitsu/api/owner/analytics/usage?days=30";
  if (dataset === "watchers") {
    return "/api/kitsu/api/owner/leaderboards/watch-time?limit=100";
  }
  const params = new URLSearchParams({ limit: "50", offset: String(offset) });
  if (query && dataset === "users") params.set("q", query);
  if (query && dataset === "watch-history") params.set("q", query);
  return `/api/kitsu/api/owner/${dataset}?${params}`;
}

export default function OwnerDataView() {
  const [dataset, setDataset] = React.useState<Dataset>("overview");
  const [query, setQuery] = React.useState("");
  const [appliedQuery, setAppliedQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [payload, setPayload] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<unknown>(null);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setDetail(null);
    try {
      const response = await fetch(requestPath(dataset, appliedQuery, offset), {
        cache: "no-store",
      });
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Backend returned an unreadable response (${response.status}).`);
      }
      if (!response.ok) {
        const body = record(result);
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : `Backend responded ${response.status}.`
        );
      }
      setPayload(result);
    } catch (reason) {
      setPayload(null);
      setError(reason instanceof Error ? reason.message : "Could not load backend data.");
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, dataset, offset]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!selectedId || (dataset !== "users" && dataset !== "groups")) {
      setDetail(null);
      return;
    }
    const detailPath =
      dataset === "users"
        ? `/api/kitsu/api/owner/users/${encodeURIComponent(selectedId)}?activity_limit=100&watch_limit=100`
        : `/api/kitsu/api/owner/groups/${encodeURIComponent(selectedId)}?activity_limit=100`;
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    void fetch(detailPath, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        let result: unknown;
        try {
          result = await response.json();
        } catch {
          throw new Error(`Backend returned an unreadable response (${response.status}).`);
        }
        if (!response.ok) {
          const body = record(result);
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : `Backend responded ${response.status}.`
          );
        }
        setDetail(result);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setDetail(null);
        setDetailError(
          reason instanceof Error ? reason.message : "Could not load the record."
        );
      })
      .finally(() => setDetailLoading(false));
    return () => controller.abort();
  }, [dataset, selectedId]);

  const data = record(payload);
  const rows = Array.isArray(data?.items)
    ? data.items.map(record).filter((item): item is Record<string, unknown> => item !== null)
    : [];
  const canInspect = dataset === "users" || dataset === "groups";
  const total = typeof data?.total === "number" ? data.total : null;
  const hasMore = data?.has_more === true;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backend data</h1>
        <p className="text-sm text-muted-foreground">
          Read-only views of operational records and analytics. Every request is
          checked against the owner session; payment references and write
          operations are not exposed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Backend data sections">
        {datasets.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={dataset === item.id ? "default" : "outline"}
            aria-pressed={dataset === item.id}
            onClick={() => {
              setDataset(item.id);
              setOffset(0);
              setAppliedQuery("");
              setQuery("");
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {datasets.find((item) => item.id === dataset)?.searchable ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setOffset(0);
            setAppliedQuery(query.trim());
          }}
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dataset === "users" ? "Search user names or usernames" : "Search saved watch titles"}
            aria-label="Search backend records"
            className="max-w-sm"
            maxLength={100}
          />
          <Button type="submit" variant="outline" disabled={loading}>
            Search
          </Button>
        </form>
      ) : null}

      {error ? (
        <Card role="alert" className="border-destructive/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading backend records…
        </p>
      ) : null}

      {!loading && payload !== null ? (
        rows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {datasets.find((item) => item.id === dataset)?.label}
              </CardTitle>
              <CardDescription>
                {total === null ? `${rows.length} records` : `${total.toLocaleString()} records`}
                {dataset === "users" || dataset === "groups" ? " · select a record to inspect details" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {rows.map((item, index) => {
                const id = itemId(item, dataset);
                const primary =
                  item.name ??
                  item.title ??
                  item.username ??
                  item.schedule_id ??
                  item.event_type ??
                  item.id ??
                  `Record ${offset + index + 1}`;
                const secondary = Object.entries(item)
                  .filter(([key]) => key !== "name" && key !== "title")
                  .slice(0, 5)
                  .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
                  .join(" · ");
                return (
                  <div
                    key={`${id ?? "row"}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{String(primary)}</p>
                      <p className="break-all text-xs text-muted-foreground">{secondary}</p>
                    </div>
                    {canInspect && id !== null ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedId(id)}
                      >
                        Inspect
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {datasets.find((item) => item.id === dataset)?.label}
              </CardTitle>
              <CardDescription>
                {dataset === "overview"
                  ? "Current process, community, and operation totals."
                  : dataset === "usage"
                    ? "Daily activity mix, popular titles, and new-user/group counts."
                    : "No matching records in this page."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )
      ) : null}

      {canInspect && selectedId ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">
                {dataset === "users" ? "User record" : "Group record"} · {selectedId}
              </CardTitle>
              <Badge variant="secondary">Read only</Badge>
            </div>
            <CardDescription>
              Detail includes up to 100 recent activity and watch-history rows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Loading details…</p>
            ) : detailError ? (
              <p role="alert" className="text-sm text-destructive">{detailError}</p>
            ) : detail !== null ? (
              <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(detail, null, 2)}
              </pre>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {data && (total !== null || hasMore) && rows.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading || offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - 50))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {total === null ? `Showing ${offset + 1}–${offset + rows.length}` : `${Math.min(offset + rows.length, total)} of ${total}`}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={loading || !hasMore}
            onClick={() => setOffset((value) => value + 50)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
