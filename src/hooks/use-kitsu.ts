"use client";

import * as React from "react";

export interface KitsuFetch<T> {
  data: T | null;
  error: string | null;
  /** Machine-readable BFF error kind (e.g. admin not-configured/forbidden). */
  errorCode: string | null;
  loading: boolean;
  updatedAt: number | null;
  sessionExpired: boolean;
  refresh: () => void;
}

interface Options<T> {
  hours?: number;
  /** Extra query params (from/to/bucket/limit/…). Undefined values are skipped. */
  query?: Record<string, string | number | undefined>;
  refreshMs?: number;
  paused?: boolean;
  /** BFF prefix. Defaults to the authed operator proxy. */
  base?: string;
  /** Server-rendered first paint: no fetch waterfall on load. */
  initialData?: T;
  initialError?: string | null;
  initialCode?: string | null;
  initialAt?: number | null;
}

function errorDetails(
  status: number,
  body: string
): { message: string; code: string | null } {
  if (status === 401)
    return { message: "Operator session expired. Sign in again.", code: null };
  try {
    const parsed = JSON.parse(body) as { error?: string; code?: string };
    if (parsed.error) {
      return {
        message: `Request failed: ${parsed.error}`,
        code: typeof parsed.code === "string" ? parsed.code : null,
      };
    }
  } catch {
    // fall through to generic message
  }
  return { message: `Request failed with status ${status}.`, code: null };
}

/**
 * Poll a BFF `/api/kitsu/…` endpoint. Keeps the last good payload visible
 * when a refresh fails (errors never become zero-shaped data).
 */
export function useKitsu<T>(path: string, opts: Options<T> = {}): KitsuFetch<T> {
  const {
    hours,
    query,
    refreshMs = 45000,
    paused = false,
    base = "/api/kitsu",
    initialData,
    initialError,
    initialCode,
    initialAt,
  } = opts;
  const queryKey = JSON.stringify(query ?? null);
  const [data, setData] = React.useState<T | null>(initialData ?? null);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [errorCode, setErrorCode] = React.useState<string | null>(
    initialCode ?? null
  );
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
    const search = new URLSearchParams();
    if (hours !== undefined) search.set("hours", String(hours));
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) search.set(k, String(v));
      }
    }
    const qs = search.toString();
    const url = qs ? `${base}/${path}?${qs}` : `${base}/${path}`;

    async function load() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401) setSessionExpired(true);
          const details = errorDetails(res.status, await res.text());
          setError(details.message);
          setErrorCode(details.code);
          setLoading(false);
          return;
        }
        const json = (await res.json()) as T;
        setData(json);
        setError(null);
        setErrorCode(null);
        setSessionExpired(false);
        setUpdatedAt(Date.now());
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network request failed.");
        setErrorCode(null);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // First paint shows the loader; later refreshes keep stale data
    // visible (stale-while-revalidate). `query` is read via `queryKey`
    // so inline option objects don't refetch every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, hours, tick, base, queryKey]);

  React.useEffect(() => {
    if (paused || refreshMs <= 0) return;
    const id = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(id);
  }, [paused, refreshMs, refresh]);

  return { data, error, errorCode, loading, updatedAt, sessionExpired, refresh };
}
