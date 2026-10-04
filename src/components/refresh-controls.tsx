"use client";

import * as React from "react";
import { CalendarRange, Pause, Play, RefreshCw } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { OptionDropdown } from "@/components/option-dropdown";
import { formatAgo } from "@/lib/kitsu/derive";
import { cn } from "cn";

export const RANGE_OPTIONS = [
  { label: "Last hour", hours: 1, description: "Live pulse · minute samples" },
  { label: "Last 6 hours", hours: 6, description: "Recent window" },
  { label: "Last 24 hours", hours: 24, description: "Daily ops · default" },
  { label: "Last 7 days", hours: 168, description: "Weekly trend" },
  { label: "Last 30 days", hours: 720, description: "Monthly view" },
  { label: "Last 90 days", hours: 2160, description: "Full retention" },
] as const;

export function useDashboardControls(defaultHours = 24) {
  const [hours, setHours] = React.useState(defaultHours);
  const [paused, setPaused] = React.useState(false);
  return { hours, setHours, paused, setPaused };
}

export function RefreshControls({
  hours,
  onHours,
  paused,
  onPaused,
  onRefresh,
  updatedAt,
  live,
}: {
  hours: number;
  onHours: (hours: number) => void;
  paused: boolean;
  onPaused: (paused: boolean) => void;
  onRefresh: () => void;
  updatedAt: number | null;
  /** True when the freshest fetch succeeded. */
  live: boolean;
}) {
  const [spinning, setSpinning] = React.useState(false);

  const handleRefresh = () => {
    onRefresh();
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 900);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OptionDropdown
        value={String(hours)}
        onChange={(v) => onHours(Number(v))}
        label="Time range"
        icon={CalendarRange}
        className="w-48"
        options={RANGE_OPTIONS.map((o) => ({
          value: String(o.hours),
          label: o.label,
          description: o.description,
        }))}
      />
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
        <Button
          variant={paused ? "default" : "ghost"}
          size="sm"
          onClick={() => onPaused(!paused)}
          aria-pressed={paused}
          title={paused ? "Resume auto-refresh" : "Pause auto-refresh"}
          className="rounded-md gap-1.5"
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <span aria-hidden className="h-5 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleRefresh}
          aria-label="Refresh now"
          title="Refresh now"
          className="rounded-md"
        >
          <RefreshCw
            className={cn("size-4", spinning && "animate-spin")}
          />
        </Button>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          aria-hidden
          className={cn(
            "inline-block size-2 rounded-full",
            live ? "bg-emerald-500" : "bg-red-500"
          )}
        />
        {updatedAt ? `Updated ${formatAgo(new Date(updatedAt).toISOString())}` : "Waiting for data"}
        {paused ? " · auto-refresh paused" : " · auto-refresh 45s"}
      </span>
    </div>
  );
}
