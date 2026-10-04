"use client";

import * as React from "react";
import { Clock } from "@/lib/icons";
import { cn } from "cn";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

let cachedNow = 0;

function subscribe(notify: () => void): () => void {
  cachedNow = Date.now();
  notify();
  const id = window.setInterval(() => {
    cachedNow = Date.now();
    notify();
  }, 1000);
  return () => window.clearInterval(id);
}

/** Live UTC clock. Server renders a placeholder (snapshot 0), client ticks every second. */
export function UtcClock({ className }: { className?: string }) {
  const now = React.useSyncExternalStore(subscribe, () => cachedNow, () => 0);

  if (now === 0) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums",
          className
        )}
      >
        <Clock className="size-3.5" />
        --:--:-- UTC
      </span>
    );
  }

  const d = new Date(now);
  const text = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;

  return (
    <time
      dateTime={d.toISOString()}
      title={`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${text}`}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums",
        className
      )}
    >
      <Clock className="size-3.5" aria-hidden />
      {text}
    </time>
  );
}
