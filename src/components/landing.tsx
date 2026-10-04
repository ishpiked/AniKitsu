"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Bot,
  MonitorPlay,
  Pause,
  Play,
  Search,
  Trophy,
  Users,
  Zap,
} from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { StatusBadge } from "@/components/status";
import { formatMs, formatPercent } from "@/lib/kitsu/derive";
import type { OverallState } from "@/lib/kitsu/types";
import { cn } from "cn";

export interface LandingStats {
  providersUp: number;
  providersTotal: number;
  apiUptime: number | null;
  apiCoverage: number | null;
  apiLatency: number | null;
  apiP95: number | null;
  botStatus: string | null;
  botLatency: number | null;
  overall: OverallState;
  providers: { name: string; status: string | null }[];
}

const BOT_URL = "https://t.me/AniKitsuBot";

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Subtle border shift on hover. No glow, no tracking. */
function Spotlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/spot relative rounded-xl transition-all duration-200",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border border-transparent transition-all duration-200 group-hover/spot:border-foreground/10"
      />
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "left";
}) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        centered ? "items-center text-center" : "items-start text-left"
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h2 className="max-w-xl text-balance text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {body ? (
        <p className="max-w-2xl text-pretty text-sm text-muted-foreground md:text-base">
          {body}
        </p>
      ) : null}
    </div>
  );
}

const dotClass = (status: string | null) =>
  status === "up"
    ? "bg-emerald-500"
    : status === "down"
      ? "bg-red-500"
      : "bg-zinc-400 dark:bg-zinc-600";

/* ---------------- feature previews ---------------- */

function RoomsPreview() {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/50 p-5">
      <div className="flex items-center gap-2">
        {["AK", "JM", "RS", "+1"].map((n) => (
          <span
            key={n}
            className="flex size-9 items-center justify-center rounded-full border bg-card text-[11px] font-medium"
          >
            {n}
          </span>
        ))}
        <span className="ml-1 text-xs text-muted-foreground">
          4 watching · Interstellar
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-border"
        role="img"
        aria-label="Playback at 62 percent"
      >
        <motion.div
          initial={reduce ? { width: "62%" } : { width: "8%" }}
          whileInView={{ width: "62%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="h-full rounded-full bg-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full border bg-card">
          <Pause className="size-4" aria-hidden />
        </span>
        <span className="flex size-9 items-center justify-center rounded-full border bg-card">
          <Play className="size-4" aria-hidden />
        </span>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          1:24:10 / 2:16:00
        </span>
        <Badge variant="secondary">host: you</Badge>
      </div>
    </div>
  );
}

function ResolvePreview() {
  const reduce = useReducedMotion();
  const rows = [
    { name: "Nebula", ms: "412 ms", w: "34%", best: true },
    { name: "Lisbon", ms: "700 ms", w: "58%", best: false },
    { name: "Mista", ms: "2.7 s", w: "92%", best: false },
  ];
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/50 p-5" aria-hidden>
      {rows.map((r, i) => (
        <div key={r.name} className="flex items-center gap-3 text-sm">
          <span className="w-16 shrink-0 font-medium">{r.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
            <motion.div
              initial={reduce ? { width: r.w } : { width: "4%" }}
              whileInView={{ width: r.w }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                r.best ? "bg-emerald-500" : "bg-foreground/50"
              )}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {r.ms}
          </span>
        </div>
      ))}
      <p className="pt-1 font-mono text-xs text-muted-foreground">
        → Nebula wins · 1080p validated
      </p>
    </div>
  );
}

function SearchPreview() {
  const rows = [
    { title: "Interstellar", meta: "2014 · Sci-Fi · 8.7" },
    { title: "Dune: Part Two", meta: "2024 · Sci-Fi · 8.2" },
    { title: "Breaking Bad", meta: "2008 · Series · 5 seasons" },
  ];
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-4">
      <div className="rounded-md border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
        /stream dune part two
      </div>
      {rows.map((r) => (
        <div
          key={r.title}
          className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors hover:border-foreground/25"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] text-muted-foreground">
            IMG
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <p className="text-xs text-muted-foreground">{r.meta}</p>
          </div>
          <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      ))}
    </div>
  );
}

function ProxyPreview() {
  const nodes = ["Browser", "Kitsu proxy", "Upstream"];
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-5"
      aria-label="Request flow: browser, Kitsu proxy, upstream"
    >
      {nodes.map((n, i) => (
        <React.Fragment key={n}>
          <div
            className={cn(
              "rounded-md border bg-card px-3 py-2.5 text-center font-mono text-xs",
              i === 1 && "border-foreground/30 font-semibold"
            )}
          >
            {n}
            {i === 1 ? " · rewrites HLS + carries referer" : ""}
          </div>
          {i < nodes.length - 1 ? (
            <div aria-hidden className="flex justify-center">
              <span className="h-4 w-px bg-border" />
            </div>
          ) : null}
        </React.Fragment>
      ))}
      <p className="font-mono text-xs text-muted-foreground">
        segments · keys · subtitles · init data
      </p>
    </div>
  );
}

function BotPreview() {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/50 p-4 text-sm">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-background">
        /stream severance season 2
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-3 py-2">
        <p className="font-medium">Severance (2022) · 10 episodes released</p>
        <div className="mt-2 flex gap-2">
          <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
            Watch
          </span>
          <span className="rounded-full border px-3 py-1 text-xs">
            Share link
          </span>
        </div>
      </div>
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-background">
        /party Friday 20:00
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-3 py-2">
        Room created · 3 joined · autoplay on
      </div>
    </div>
  );
}

function HealthPreview({ stats }: { stats: LandingStats | null }) {
  return (
    <div className="flex flex-col divide-y rounded-lg border bg-muted/50 text-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-16 shrink-0 font-medium">API</span>
        <StatusBadge status="up" />
        <span className="ml-auto tabular-nums text-muted-foreground">
          {stats ? formatMs(stats.apiLatency) : "—"}
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-16 shrink-0 font-medium">Bot</span>
        <StatusBadge status={stats?.botStatus ?? null} />
        <span className="ml-auto tabular-nums text-muted-foreground">
          {stats ? formatMs(stats.botLatency) : "—"}
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-16 shrink-0 font-medium">Uptime</span>
        <span className="font-semibold tabular-nums">
          {stats ? formatPercent(stats.apiUptime) : "—"}
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          60s snapshots
        </span>
      </div>
    </div>
  );
}

type PreviewKey = "rooms" | "resolve" | "search" | "proxy" | "bot" | "health";

const featureList: {
  key: PreviewKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    key: "rooms",
    icon: Users,
    title: "Watch Together rooms",
    body: "Synced pause, play, and seek with host controls, presence, room chat, and scheduled parties, including inline personal rooms.",
  },
  {
    key: "resolve",
    icon: Zap,
    title: "Best-source resolution",
    body: "Servers are probed in parallel and validated before acceptance. The fastest playable source wins, with bounded fallback.",
  },
  {
    key: "search",
    icon: Search,
    title: "Title search & discovery",
    body: "Movies, series, and anime through catalog metadata, with details, seasons, and released episodes in one place.",
  },
  {
    key: "proxy",
    icon: MonitorPlay,
    title: "Player-grade proxying",
    body: "HLS playlists, segments, keys, and subtitles are rewritten and proxied past CORS and hotlink walls.",
  },
  {
    key: "bot",
    icon: Bot,
    title: "Telegram bot layer",
    body: "Inline search, trending, recommendations, resume points, alerts, quizzes, and Stars donations.",
  },
  {
    key: "health",
    icon: Activity,
    title: "Honest health data",
    body: "60-second snapshots with coverage, stale flags, and uptime. The same data as the status page, shown live.",
  },
];

/* ---------------- how it works ---------------- */

const steps = [
  {
    n: "01",
    tab: "Search",
    title: "Find the title",
    body: "Type a title in Telegram, inline in any chat, or from the CLI. Metadata, artwork, seasons, and released episodes resolve instantly.",
    checks: ["Ranked catalog matches", "Full season and episode data", "Unreleased episodes stay hidden"],
    code: `$ python cli.py "breaking bad" -s 1 -e 1\n✓ metadata · Breaking Bad (2008)\n✓ season 1 · 7 released episodes`,
  },
  {
    n: "02",
    tab: "Resolve",
    title: "Race the providers",
    body: "Candidates are validated before acceptance. Dead variants drop out and the best working quality is selected. An inconclusive probe never discards a reachable source.",
    checks: ["Parallel probes with timeouts", "Preferred server stays preferred", "Bounded automatic fallback"],
    code: `✓ candidates · Nebula · Lisbon · Tardie\n✓ probe 1080p · ok in 412 ms\n→ preferred server kept`,
  },
  {
    n: "03",
    tab: "Watch",
    title: "Play and share",
    body: "Play through the backend proxy with checkpoints and subtitles, or mint a short-lived signed share link for a room.",
    checks: ["HLS proxy with recovery", "Checkpoints and resume", "Signed links with server-side auth"],
    code: `→ share ready · signed · 30 min\n✓ checkpoint saved 1:24:10\n✓ subtitles · timing +120 ms`,
  },
];

/* ---------------- page ---------------- */

export default function LandingView({ stats }: { stats: LandingStats | null }) {
  const [activeFeature, setActiveFeature] =
    React.useState<PreviewKey>("rooms");

  return (
    <div className="flex min-h-svh flex-col">
      {/* ---------- hero ---------- */}
      <section className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-20 pb-12 text-center md:px-8 md:pt-28 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-5"
          >
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Find it. Resolve it. Watch it together.
            </h1>
            <p className="max-w-xl text-pretty text-muted-foreground md:text-lg">
              Kitsu races every provider for the best playable source, then
              plays it in your browser or inside Telegram, solo or in a synced
              room.
            </p>
            <div className="group flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <a href={BOT_URL} target="_blank" rel="noreferrer">
                  Open the Telegram bot
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/status">View live status</Link>
              </Button>
            </div>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4"
          >
            {[
              {
                label: "Providers up",
                value:
                  stats !== null
                    ? `${stats.providersUp}/${stats.providersTotal}`
                    : "—",
              },
              {
                label: "API uptime · 24h",
                value: stats ? formatPercent(stats.apiUptime) : "—",
              },
              {
                label: "Mean latency",
                value: stats ? formatMs(stats.apiLatency) : "—",
              },
              {
                label: "Bot probe",
                value: stats ? formatMs(stats.botLatency) : "—",
              },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1 bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </motion.dl>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
            className="mt-10 w-full max-w-3xl"
          >
            <Spotlight>
              <div className="overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-center gap-2 border-b px-4 py-2.5">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-amber-500/70" />
                  <span className="size-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 rounded-md border bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                    kitsu · live status
                  </span>
                  <span className="ml-auto">
                    {stats ? (
                      <StatusPill
                        status={
                          stats.overall === "operational" ? "up" : stats.overall
                        }
                        label={stats.overall === "operational" ? "operational" : stats.overall}
                      />
                    ) : (
                      <StatusPill status="unknown" label="unknown" />
                    )}
                  </span>
                </div>
                <div className="flex flex-col divide-y text-sm">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-20 shrink-0 font-medium">API</span>
                    <StatusPill status="up" label="up" showDot />
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {stats
                        ? `${formatMs(stats.apiLatency)} · p95 ${formatMs(stats.apiP95)}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-20 shrink-0 font-medium">Bot</span>
                    <StatusPill
                      status={stats?.botStatus === "up" ? "up" : "unknown"}
                      label={stats?.botStatus ?? "unknown"}
                      showDot
                    />
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {stats ? formatMs(stats.botLatency) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-20 shrink-0 font-medium">Providers</span>
                    <span className="flex items-center gap-1" aria-hidden>
                      {(stats?.providers ?? []).slice(0, 8).map((p) => (
                        <span
                          key={p.name}
                          title={p.name}
                          className={cn("size-2 rounded-full", dotClass(p.status))}
                        />
                      ))}
                    </span>
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {stats
                        ? `${stats.providersUp}/${stats.providersTotal} up`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-mono">60s snapshots · UTC</span>
                    <Link
                      href="/status"
                      className="group/link flex items-center gap-1 font-medium text-foreground"
                    >
                      Open full dashboard
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover/link:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </Spotlight>
          </motion.div>
        </div>
      </section>

      {/* ---------- features: hover-to-preview ---------- */}
      <section
        id="features"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 md:px-8 md:py-16"
      >
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="A full streaming layer, not a link shortcut"
            body="Hover or tap a capability. The panel shows what it looks like in practice."
          />
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div
            role="group"
            aria-label="Capabilities"
            className="flex flex-col gap-1"
          >
            {featureList.map((f) => {
              const active = activeFeature === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onMouseEnter={() => setActiveFeature(f.key)}
                  onFocus={() => setActiveFeature(f.key)}
                  onClick={() => setActiveFeature(f.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                    active
                      ? "border-foreground/25 bg-card shadow-sm"
                      : "border-transparent hover:border-border hover:bg-card/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                      active ? "bg-muted" : "bg-muted/50"
                    )}
                  >
                    <f.icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm font-medium">{f.title}</span>
                  <ArrowRight
                    aria-hidden
                    className={cn(
                      "ml-auto size-4 shrink-0 transition-all duration-200",
                      active
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-1 opacity-0"
                    )}
                  />
                </button>
              );
            })}
          </div>
          <div className="md:sticky md:top-24">
            <Spotlight>
              <Card className="overflow-hidden">
                <CardContent className="flex flex-col gap-4 p-5 md:p-6">
                  {featureList
                    .filter((f) => f.key === activeFeature)
                    .map((f) => (
                      <motion.div
                        key={f.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="flex flex-col gap-4"
                      >
                        <div>
                          <p className="font-medium">{f.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {f.body}
                          </p>
                        </div>
                        {f.key === "rooms" ? <RoomsPreview /> : null}
                        {f.key === "resolve" ? <ResolvePreview /> : null}
                        {f.key === "search" ? <SearchPreview /> : null}
                        {f.key === "proxy" ? <ProxyPreview /> : null}
                        {f.key === "bot" ? <BotPreview /> : null}
                        {f.key === "health" ? (
                          <HealthPreview stats={stats} />
                        ) : null}
                      </motion.div>
                    ))}
                </CardContent>
              </Card>
            </Spotlight>
          </div>
        </div>
      </section>

      <Separator />

      {/* ---------- how it works: alternating rows ---------- */}
      <section
        id="how"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 md:px-8 md:py-16"
      >
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Three steps to playback"
            body="The same pipeline whether you start from chat, inline, or the terminal."
          />
        </Reveal>
        <div className="mt-10 flex flex-col gap-12 md:gap-16">
          {steps.map((s, i) => {
            const flip = i % 2 === 1;
            return (
              <div
                key={s.n}
                className="grid items-center gap-6 md:grid-cols-2 md:gap-10"
              >
                <Reveal className={flip ? "md:order-2" : ""}>
                  <div className="flex flex-col items-start gap-3">
                    <Badge variant="secondary" className="font-mono tabular-nums">
                      {s.n}
                    </Badge>
                    <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                      {s.title}
                    </h3>
                    <p className="max-w-md text-sm text-muted-foreground md:text-base">
                      {s.body}
                    </p>
                    <ul className="flex flex-col gap-1.5 pt-1">
                      {s.checks.map((c) => (
                        <li
                          key={c}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400">
                            ✓
                          </span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
                <Reveal
                  delay={0.08}
                  className={flip ? "md:order-1" : ""}
                >
                  <Spotlight>
                    <div className="overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md">
                      <div className="flex items-center gap-2 border-b px-4 py-2.5">
                        <span className="size-2.5 rounded-full bg-red-500/70" />
                        <span className="size-2.5 rounded-full bg-amber-500/70" />
                        <span className="size-2.5 rounded-full bg-emerald-500/70" />
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          kitsu · {s.tab.toLowerCase()}
                        </span>
                      </div>
                      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
                        {s.code}
                      </pre>
                    </div>
                  </Spotlight>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ---------- providers: live board ---------- */}
      <section
        id="providers"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 md:px-8 md:py-16"
      >
        <Reveal>
          <SectionHeading
            eyebrow="Providers"
            title="Live right now"
            body="Real 10-minute resolve probes across every server. Availability always depends on upstream services."
          />
        </Reveal>
        <Reveal delay={0.08}>
          <Spotlight className="mx-auto mt-8 max-w-3xl">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3">
                <CardTitle className="text-sm font-medium">
                  Probe board
                  <span className="ml-2 tabular-nums text-muted-foreground">
                    {stats
                      ? `${stats.providersUp}/${stats.providersTotal} up`
                      : "—"}
                  </span>
                </CardTitle>
                <Link
                  href="/status"
                  className="group/link flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Full history
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover/link:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {stats ? (
                  stats.providers.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <span
                        aria-hidden
                        className={cn("size-2 rounded-full", dotClass(p.status))}
                      />
                      <strong className="font-medium">{p.name}</strong>
                      <span className="ml-auto">
                        <StatusBadge status={p.status} />
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Provider data is unavailable right now. Check the{" "}
                    <Link href="/status" className="underline">
                      status page
                    </Link>
                    .
                  </p>
                )}
              </CardContent>
            </Card>
          </Spotlight>
        </Reveal>
      </section>

      <Separator />

      {/* ---------- bot: chat mock ---------- */}
      <section
        id="bot"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 md:px-8 md:py-16"
      >
        <div className="grid items-center gap-8 md:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium text-muted-foreground">
              Telegram bot
            </p>
            <h2 className="mt-1 max-w-xl text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              Your theater lives in chat
            </h2>
            <p className="mt-2 max-w-lg text-pretty text-sm text-muted-foreground md:text-base">
              Search inline from any chat, start synced parties in groups, get
              premiere alerts, track what you watch, and quiz your friends
              without leaving Telegram.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "/stream",
                "/trending",
                "/party",
                "/recommend",
                "/quiz",
                "/alerts",
              ].map((c) => (
                <code
                  key={c}
                  className="rounded-md border bg-muted px-2 py-1 font-mono text-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25"
                >
                  {c}
                </code>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <a
                  href={BOT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="group/btn"
                >
                  Chat with @AniKitsuBot
                  <ArrowRight
                    className="size-4 transition-transform group-hover/btn:translate-x-0.5"
                    aria-hidden
                  />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/bot" className="group/btn">
                  Bot details
                  <ArrowRight
                    className="size-4 transition-transform group-hover/btn:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Spotlight>
              <div className="mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <Logo className="size-9 rounded-full" />
                  <div>
                    <p className="text-sm font-medium">Kitsu</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      bot · online
                    </p>
                  </div>
                  <Trophy className="ml-auto size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="flex flex-col gap-2.5 bg-muted/40 p-4 text-sm">
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-background">
                    /stream dune part two
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-3 py-2.5">
                    <p className="font-medium">Dune: Part Two (2024)</p>
                    <p className="text-xs text-muted-foreground">
                      Sci-Fi · 2h 46m · 3 servers ready
                    </p>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                        Watch
                      </span>
                      <span className="rounded-full border px-3 py-1 text-xs">
                        + Party
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-background">
                    + Party · Friday 20:00
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-3 py-2">
                    Room created · invite sent to the group
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t px-4 py-3">
                  <div className="flex-1 rounded-full border bg-muted/60 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                    /pause
                  </div>
                  <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </div>
              </div>
            </Spotlight>
          </Reveal>
        </div>
      </section>

      <Separator />

      {/* ---------- status CTA ---------- */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8 md:py-16">
        <Reveal>
          <Spotlight>
            <Card className="transition-colors duration-200 hover:border-foreground/25">
              <CardContent className="flex flex-col items-start gap-5 p-6 md:flex-row md:items-center md:p-8">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    Radically transparent operations
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every probe, latency sample, and outage is public, with
                    coverage shown next to every percentage.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {stats ? (
                      <StatusBadge
                        status={
                          stats.overall === "operational" ? "up" : stats.overall
                        }
                      />
                    ) : null}
                    {stats?.apiUptime !== null &&
                    stats?.apiUptime !== undefined ? (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatPercent(stats.apiUptime)} API uptime · 24h
                        {stats.apiCoverage !== null
                          ? ` · ${formatPercent(stats.apiCoverage)} coverage`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/status" className="group/btn">
                      Live status page
                      <ArrowRight
                        className="size-4 transition-transform group-hover/btn:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/login">Dev sign in</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Spotlight>
        </Reveal>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:px-8">
          <span className="flex items-center gap-2">
            <Logo className="size-6" />
            <span className="font-medium text-foreground">Kitsu</span>
          </span>
          <span className="md:ml-4">
            Stream sources and metadata rely on upstream availability.
          </span>
          <nav aria-label="Footer" className="flex gap-4 md:ml-auto">
            <Link
              href="/status"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Status
            </Link>
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Bot
            </a>
            <Link
              href="/login"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Dev
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
