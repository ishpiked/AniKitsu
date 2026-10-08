"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Users } from "@/lib/icons";
import { useKitsu } from "@/hooks/use-kitsu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionDropdown } from "@/components/option-dropdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PanelEmpty } from "@/components/charts";
import { AdminState } from "@/components/admin-state";
import { formatAgo, formatUtc } from "@/lib/kitsu/derive";
import type { ActivityResponse } from "@/lib/kitsu/types";

export interface Initial<T> {
  data: T | null;
  error: string | null;
  code?: string | null;
}

const ENTITY_OPTIONS = [
  { label: "All entities", value: "all" },
  { label: "Users", value: "user" },
  { label: "Groups", value: "group" },
] as const;

const RANGE_OPTIONS = [
  { label: "Last 24 hours", hours: 24 },
  { label: "Last 7 days", hours: 168 },
  { label: "Last 30 days", hours: 720 },
] as const;

const PAGE_SIZE = 50;

export default function ActivityView({
  initialActivity,
  initialEntity,
  initialHours,
  fetchedAt,
}: {
  initialActivity: Initial<ActivityResponse>;
  initialEntity: "all" | "user" | "group";
  initialHours: number;
  fetchedAt: number | null;
}) {
  const [entity, setEntity] = React.useState<"all" | "user" | "group">(
    initialEntity
  );
  const [hours, setHours] = React.useState(initialHours);
  const [eventType, setEventType] = React.useState("");
  const [appliedEventType, setAppliedEventType] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const activity = useKitsu<ActivityResponse>("api/admin/activity", {
    query: {
      entity,
      event_type: appliedEventType || undefined,
      hours,
      limit: PAGE_SIZE,
      offset,
    },
    paused,
    initialData:
      entity === initialEntity &&
      hours === initialHours &&
      appliedEventType === "" &&
      offset === 0
        ? (initialActivity.data ?? undefined)
        : undefined,
    initialError:
      entity === initialEntity &&
      hours === initialHours &&
      appliedEventType === "" &&
      offset === 0
        ? initialActivity.error
        : null,
    initialCode:
      entity === initialEntity &&
      hours === initialHours &&
      appliedEventType === "" &&
      offset === 0
        ? initialActivity.code
        : null,
    initialAt:
      entity === initialEntity &&
      hours === initialHours &&
      appliedEventType === "" &&
      offset === 0
        ? fetchedAt
        : null,
  });

  const applyFilters = () => {
    setAppliedEventType(eventType.trim());
    setOffset(0);
  };

  const rawItems = activity.data;
  const items = Array.isArray(rawItems)
    ? rawItems
    : (rawItems?.items ?? []);
  const total =
    !Array.isArray(rawItems) && typeof rawItems?.total === "number"
      ? rawItems.total
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">
            Bounded, newest-first event feed. Items carry only the entity
            kind, event type, and timestamp. Telegram identifiers and event
            details are omitted by design.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
          >
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline" size="sm" onClick={activity.refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {activity.sessionExpired ? (
        <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
          Operator session expired.{" "}
          <Link href="/login" className="underline">
            Sign in again
          </Link>
          .
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Entity, event type, and window. Changing a filter resets to the
            newest page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <OptionDropdown
            value={entity}
            onChange={(v) => {
              setEntity(v as "all" | "user" | "group");
              setOffset(0);
            }}
            label="Entity"
            icon={Users}
            className="w-44"
            options={ENTITY_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <OptionDropdown
            value={String(hours)}
            onChange={(v) => {
              setHours(Number(v));
              setOffset(0);
            }}
            label="Time window"
            icon={Clock}
            className="w-44"
            options={RANGE_OPTIONS.map((o) => ({
              value: String(o.hours),
              label: o.label,
            }))}
          />
          <Input
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            placeholder="event_type filter"
            aria-label="Event type filter"
            className="max-w-52"
          />
          <Button size="sm" onClick={applyFilters}>
            Apply
          </Button>
        </CardContent>
      </Card>

      {activity.data ? (
        <>
          {items.length === 0 ? (
            <PanelEmpty
              title="No events"
              detail="Nothing matched these filters in this window. Absence here is absence of matching events, not proof of inactivity."
            />
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-160 text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Time (UTC)</th>
                      <th className="px-4 py-2 font-medium">Ago</th>
                      <th className="px-4 py-2 font-medium">Entity</th>
                      <th className="px-4 py-2 font-medium">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr
                        key={`${item.timestamp}-${item.event_type}-${i}`}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-2 font-mono text-xs tabular-nums">
                          {formatUtc(item.timestamp)}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatAgo(item.timestamp)}
                        </td>
                        <td className="px-4 py-2">{item.entity}</td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {item.event_type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Newer
            </Button>
            <span className="text-muted-foreground tabular-nums">
              Offset {offset}
              {total !== null ? ` of ${total}` : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                total !== null
                  ? offset + PAGE_SIZE >= total
                  : items.length < PAGE_SIZE
              }
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Older
            </Button>
          </div>
        </>
      ) : activity.loading ? (
        <PanelEmpty
          title="Loading activity"
          detail="Fetching the newest page from the admin API."
        />
      ) : (
        <AdminState
          code={activity.errorCode}
          error={activity.error}
          onRetry={activity.refresh}
        />
      )}
    </div>
  );
}
