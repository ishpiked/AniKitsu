"use client";

import * as React from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TimelineStatus } from "@/lib/kitsu/derive";
import { cn } from "cn";

// ---------- layout helpers ----------

export function ChartShell({
  title,
  description,
  meta,
  children,
  footer,
}: {
  title: string;
  description?: string;
  meta?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}

export function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      {sub ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function PanelLoading({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function PanelError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm font-medium">Couldn&apos;t load this panel</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function PanelEmpty({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

// ---------- shared time formatting (UTC everywhere) ----------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function shortTick(iso: string, spanMs: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  if (spanMs > 48 * 3600 * 1000) {
    return `${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${hm}`;
  }
  return hm;
}

function fullUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
    `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`
  );
}

// ---------- time series (shadcn chart + recharts) ----------

export interface SeriesPoint {
  t: string;
  values: Record<string, number | null>;
  stale?: Record<string, boolean>;
}

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  /** Mark stale-flagged samples of this series with amber dots. */
  markStale?: boolean;
}

interface ChartRow {
  t: string;
  ms: number;
  values: Record<string, number | null>;
  stale: Record<string, boolean>;
}

export function TimeSeriesChart({
  points,
  series,
  formatY = (v: number) => String(Math.round(v * 10) / 10),
  height = 220,
  brush = false,
  emptyLabel = "No data in this range.",
}: {
  points: SeriesPoint[];
  series: SeriesDef[];
  formatY?: (v: number) => string;
  height?: number;
  brush?: boolean;
  emptyLabel?: string;
}) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());

  const rows = React.useMemo<ChartRow[]>(
    () =>
      points.map((p) => ({
        t: p.t,
        ms: new Date(p.t).getTime(),
        values: p.values,
        stale: p.stale ?? {},
      })),
    [points]
  );
  const hasValues = React.useMemo(
    () =>
      rows.some((r) =>
        series.some(
          (s) =>
            typeof r.values[s.key] === "number" &&
            Number.isFinite(r.values[s.key])
        )
      ),
    [rows, series]
  );

  const spanMs = React.useMemo(() => {
    const times = rows.map((r) => r.ms).filter((t) => !Number.isNaN(t));
    if (times.length === 0) return 0;
    return Math.max(...times) - Math.min(...times);
  }, [rows]);

  const config = React.useMemo<ChartConfig>(() => {
    const c: ChartConfig = {};
    for (const s of series) c[s.key] = { label: s.label, color: s.color };
    return c;
  }, [series]);
  const labelToKey = React.useMemo(() => {
    const m = new Map<string, SeriesDef>();
    for (const s of series) m.set(s.label, s);
    return m;
  }, [series]);

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (rows.length === 0 || !hasValues) {
    return <PanelEmpty title="No data" detail={emptyLabel} />;
  }

  const visible = series.filter((s) => !hidden.has(s.key));
  const summary = series
    .map((s) => {
      const vals = rows
        .map((r) => r.values[s.key])
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      if (vals.length === 0) return `${s.label}: no data`;
      const gaps = rows.length - vals.length;
      return `${s.label}: ${vals.length} samples, min ${formatY(Math.min(...vals))}, max ${formatY(Math.max(...vals))}${gaps > 0 ? `, ${gaps} missing` : ""}`;
    })
    .join(". ");

  return (
    <div>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <LineChart data={rows} accessibilityLayer margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="t"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={40}
            tickFormatter={(iso: string) => shortTick(iso, spanMs)}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatY}
            domain={["auto", "auto"]}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                labelFormatter={(iso) => fullUtc(String(iso))}
                formatter={(value, name, item, index, payload) => {
                  const def = labelToKey.get(String(name));
                  const row = payload as unknown as ChartRow | undefined;
                  const stale =
                    def?.markStale === true &&
                    row?.stale?.[def.key] === true;
                  return (
                    <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                      <span className="text-muted-foreground">
                        {def?.label ?? name}
                        {stale ? " · stale" : ""}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {typeof value === "number" ? formatY(value) : "—"}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={(row: ChartRow) => row.values[s.key]}
              name={s.label}
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              dot={s.markStale === true ? staleDot(s.key) : false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              hide={hidden.has(s.key)}
              type="monotone"
              isAnimationActive={false}
            />
          ))}
          {brush ? (
            <Brush
              dataKey="t"
              height={28}
              stroke="var(--border)"
              tickFormatter={(iso: string) => shortTick(String(iso), spanMs)}
            />
          ) : null}
        </LineChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
        {series.map((s) => {
          const last = [...rows]
            .reverse()
            .map((r) => r.values[s.key])
            .find((v) => typeof v === "number" && Number.isFinite(v));
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={!off}
              title={off ? `Show ${s.label}` : `Hide ${s.label}`}
              onClick={() => toggle(s.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs",
                "hover:bg-accent",
                off && "opacity-45"
              )}
            >
              <span
                aria-hidden
                className="inline-block h-0.5 w-5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium tabular-nums">
                {typeof last === "number" ? formatY(last) : "—"}
              </span>
            </button>
          );
        })}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Times in UTC. Gaps mean missing samples. Click a series to hide it.
        </span>
      </div>
      <p className="sr-only">
        Time series chart. {summary}. {visible.length === 0 ? "All series hidden." : ""}
      </p>
    </div>
  );
}

/** Dot renderer that marks stale-flagged samples with an amber ring. */
function staleDot(key: string) {
  function StaleDot(props: { cx?: number; cy?: number; payload?: ChartRow }) {
    const { cx, cy, payload } = props;
    if (
      cx === undefined ||
      cy === undefined ||
      payload?.stale?.[key] !== true ||
      typeof payload.values[key] !== "number"
    ) {
      return null;
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="var(--background)"
        stroke="#f59e0b"
        strokeWidth={2}
      />
    );
  }
  return StaleDot;
}

// ---------- bars (shadcn chart + recharts) ----------

export function BarChart({
  points,
  color = "#f43f5e",
  formatY = (v: number) => String(v),
  height = 160,
  brush = false,
  emptyLabel = "No data in this range.",
}: {
  points: { t: string; value: number | null }[];
  color?: string;
  formatY?: (v: number) => string;
  height?: number;
  brush?: boolean;
  emptyLabel?: string;
}) {
  const rows = React.useMemo(
    () => points.map((p) => ({ t: p.t, value: p.value })),
    [points]
  );
  const spanMs = React.useMemo(() => {
    const times = rows.map((r) => new Date(r.t).getTime()).filter((t) => !Number.isNaN(t));
    if (times.length === 0) return 0;
    return Math.max(...times) - Math.min(...times);
  }, [rows]);
  const max = React.useMemo(() => {
    const vals = rows
      .map((r) => r.value)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [rows]);

  if (rows.length === 0 || max === null) {
    return <PanelEmpty title="No data" detail={emptyLabel} />;
  }

  const config: ChartConfig = { value: { label: "Errors", color } };
  const summary = `Bar chart with ${rows.length} slots, max ${formatY(max)}. Times in UTC.`;

  return (
    <div>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <RechartsBarChart data={rows} accessibilityLayer margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="t"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={48}
            tickFormatter={(iso: string) => shortTick(iso, spanMs)}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatY}
            allowDecimals={false}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={
              <ChartTooltipContent
                labelFormatter={(iso) => fullUtc(String(iso))}
                formatter={(value) => (
                  <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                    <span className="text-muted-foreground">Errors</span>
                    <span className="font-mono font-medium tabular-nums">
                      {typeof value === "number" ? formatY(value) : "—"}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          {brush ? (
            <Brush
              dataKey="t"
              height={28}
              stroke="var(--border)"
              tickFormatter={(iso: string) => shortTick(String(iso), spanMs)}
            />
          ) : null}
        </RechartsBarChart>
      </ChartContainer>
      <p className="pt-1 text-right text-[11px] text-muted-foreground">
        Times in UTC. Empty slots mean missing samples.
      </p>
      <p className="sr-only">{summary}</p>
    </div>
  );
}

// ---------- status timeline (custom SVG, hover + keyboard) ----------

const timelineFill: Record<TimelineStatus, string> = {
  up: "fill-emerald-500",
  down: "fill-red-500",
  disabled: "fill-zinc-400",
  unknown: "fill-amber-400",
  nodata: "fill-zinc-300 dark:fill-zinc-700",
};

const timelineLabel: Record<TimelineStatus, string> = {
  up: "Up",
  down: "Down",
  disabled: "Disabled",
  unknown: "Unknown",
  nodata: "No data",
};

export function StatusTimeline({
  points,
  height = 56,
  emptyLabel = "No samples in this range.",
}: {
  points: { t: string; status: TimelineStatus }[];
  height?: number;
  emptyLabel?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const barH = height - 20;

  const counts = React.useMemo(() => {
    const c: Record<TimelineStatus, number> = {
      up: 0,
      down: 0,
      disabled: 0,
      unknown: 0,
      nodata: 0,
    };
    for (const p of points) c[p.status] += 1;
    return c;
  }, [points]);

  if (points.length === 0) {
    return <PanelEmpty title="No samples" detail={emptyLabel} />;
  }

  const summary = `Status timeline, ${points.length} samples: ${(
    Object.keys(counts) as TimelineStatus[]
  )
    .map((k) => `${counts[k]} ${timelineLabel[k].toLowerCase()}`)
    .join(", ")}.`;
  const hovered = hover !== null ? points[hover] : null;
  const hoverLeft =
    hover !== null ? `${((hover + 0.5) / points.length) * 100}%` : "50%";

  return (
    <div>
      <div className="relative">
        <svg
          width="100%"
          height={barH}
          role="img"
          aria-label={summary}
          className="block"
          onMouseLeave={() => setHover(null)}
        >
          {points.map((p, i) => (
            <g key={i}>
              <rect
                x={`${(i / points.length) * 100}%`}
                width={`${100 / points.length}%`}
                y={0}
                height={barH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${fullUtc(p.t)}: ${timelineLabel[p.status]}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover((h) => (h === i ? null : h))}
                className="cursor-crosshair outline-none focus-visible:stroke-foreground"
              />
              <rect
                x={`calc(${(i / points.length) * 100}% + 1px)`}
                width={`calc(${100 / points.length}% - 2px)`}
                y={hover === i ? 0 : 3}
                height={hover === i ? barH : barH - 6}
                rx={2}
                pointerEvents="none"
                className={cn(
                  timelineFill[p.status],
                  hover === i && "stroke-foreground"
                )}
              />
            </g>
          ))}
        </svg>
        {hovered ? (
          <div
            role="status"
            style={{ left: hoverLeft }}
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl"
          >
            <span className="font-medium">{fullUtc(hovered.t)}</span>
            <span className="text-muted-foreground">
              {" "}
              · {timelineLabel[hovered.status]}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
        <span>{shortTick(points[0]?.t ?? "", 0)}</span>
        <span>Hover or focus a segment for its exact sample time.</span>
        <span>{shortTick(points[points.length - 1]?.t ?? "", 0)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
        {(Object.keys(counts) as TimelineStatus[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className={cn(
                "inline-block size-2.5 rounded-sm",
                timelineFill[k].replace("fill-", "bg-")
              )}
            />
            <span className="text-muted-foreground">{timelineLabel[k]}</span>
            <span className="font-medium tabular-nums">{counts[k]}</span>
          </span>
        ))}
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
