"use client";

import * as React from "react";
import { statusView } from "@/lib/kitsu/derive";
import { StatusPill } from "@/components/status-pill";
import { cn } from "cn";

/** Status with icon + text (never color alone). Uses StatusPill for clean design. */
export function StatusBadge({
  status,
  stale = false,
  className,
}: {
  status: string | null | undefined;
  stale?: boolean | null;
  className?: string;
}) {
  const view = statusView(status);

  const pillStatus =
    view.tone === "up"
      ? "up"
      : view.tone === "down"
        ? "down"
        : view.tone === "warn"
          ? "degraded"
          : view.tone === "disabled"
            ? "unknown"
            : view.tone === "nodata"
              ? "unknown"
              : "unknown";

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StatusPill
        status={pillStatus}
        label={view.label}
        showDot
      />
      {stale === true ? (
        <StatusPill
          status="degraded"
          label="stale"
          showDot
        />
      ) : null}
    </span>
  );
}