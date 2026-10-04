"use client";

import * as React from "react";
import { cn } from "cn";

/** Pill with semantic color + optional leading dot. Clean, no gradients. */
export function StatusPill({
  status,
  label,
  showDot = true,
  className,
}: {
  status: "up" | "down" | "degraded" | "unknown" | "live" | "operational";
  label?: string;
  showDot?: boolean;
  className?: string;
}) {
  const config = {
    up: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    operational: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    down: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      dot: "bg-red-500",
    },
    degraded: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    unknown: {
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
      text: "text-zinc-600 dark:text-zinc-400",
      dot: "bg-zinc-500",
    },
    live: {
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      text: "text-sky-600 dark:text-sky-400",
      dot: "bg-sky-500",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200",
        config.bg,
        config.border,
        config.text,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            config.dot
          )}
        />
      )}
      {label ?? (
        <span className="capitalize">{status}</span>
      )}
    </span>
  );
}

/** Version pill with subtle accent. Clean, no gradients. */
export function VersionPill({
  label = "v1",
  subtitle = "live",
  className,
}: {
  label?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
      "bg-muted/50",
      "border-muted-foreground/10",
      "text-foreground",
      className
    )}>
      <span className="font-mono font-semibold">{label}</span>
      <span className="px-2 py-0.5 rounded-full bg-muted-foreground/10 text-muted-foreground/70 font-mono text-[10px]">
        {subtitle}
      </span>
    </span>
  );
}

/** Multi-status cluster for hero. */
export function StatusCluster({
  items,
  className,
}: {
  items: Array<{ status: "up" | "down" | "degraded" | "unknown" | "live" | "operational"; label?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item, i) => (
        <StatusPill key={i} status={item.status} label={item.label} />
      ))}
    </div>
  );
}