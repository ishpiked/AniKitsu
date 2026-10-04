"use client";

import * as React from "react";

export interface KitsuFetch<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  updatedAt: number | null;
  sessionExpired: boolean;
  refresh: () => void;
}

interface Options<T> {
  hours?: number;
  refreshMs?: number;
  paused?: boolean;
  /** BFF prefix. Defaults to the authed operator proxy. */
  base?: string;
  /** Server-rendered first paint: no fetch waterfall on load. */
  initialData?: T;
  initialError?: string | null;
  initialAt?: number | null;
}

function errorMessage(status: number, body: string): string {
  if (status === 401) return "Operator session expired. Sign in again.";
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) return `Request failed: ${parsed.error}`;
  } catch {
    // fall through to generic message
  }
  return `Request failed with status ${status}.`;
}

/**
 * Poll a BFF `/api/kitsu/…` endpoint. Keeps the last good payload visible
 * when a refresh fails (errors never become zero-shaped data).
 */
export function useKitsu<T>(path: string, opts: Options<T> = {}): KitsuFetch<T> {
  const {
    hours,
    refreshMs = 45000,
    paused = false,
    base = "/api/kitsu",
    initialData,
    initialError,
    initialAt,
  } = opts;
  const [data, setData] = React.useState<T | null>(initialData ?? null);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [loading, setLoading] = React.useState(
    initialData === undefined && initialError == null
  );
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(
    initialAt ?? null
  );
  const [sessionExpired, setSessionExpired] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    const url =
      hours === undefined ? `${base}/${path}` : `${base}/${path}?hours=${hours}`;

    async function load() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401) setSessionExpired(true);
          setError(errorMessage(res.status, await res.text()));
          setLoading(false);
          return;
        }
        const json = (await res.json()) as T;
        setData(json);
        setError(null);
        setSessionExpired(false);
        setUpdatedAt(Date.now());
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network request failed.");
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // First paint shows the loader; later refreshes keep stale data
    // visible (stale-while-revalidate).
  }, [path, hours, tick, base]);

  React.useEffect(() => {
    if (paused || refreshMs <= 0) return;
    const id = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(id);
  }, [paused, refreshMs, refresh]);

  return { data, error, loading, updatedAt, sessionExpired, refresh };
}
