"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Clock,
  Server,
} from "@/lib/icons";
import { PanelLoading, StatusTimeline, TimeSeriesChart } from "@/components/charts";
import { Logo } from "@/components/logo";
import { RefreshControls, useDashboardControls } from "@/components/refresh-controls";
import { StatusBadge } from "@/components/status";
import { useKitsu } from "@/hooks/use-kitsu";
import {
  formatDuration,
  formatMs,
  formatNumber,
  formatPercent,
  formatUtc,
  toTimelineStatus,
} from "@/lib/kitsu/derive";
import type { OverallState, PublicStatus } from "@/lib/kitsu/types";

const stateLabel: Record<OverallState, string> = {
  operational: "All systems operational",
  degraded: "Partial degradation",
  down: "Service disruption",
  unknown: "Status unknown",
};

export default function LandingView({
  initialHours,
  initialStatus,
}: {
  initialHours: number;
  initialStatus: { data: PublicStatus | null; error: string | null };
}) {
  const { hours, setHours, paused, setPaused } = useDashboardControls(initialHours);
  const generatedMs = Date.parse(initialStatus.data?.generated_at ?? "");
  const status = useKitsu<PublicStatus>("status", {
    base: "/api/public",
    hours,
    paused,
    refreshMs: 45000,
    initialData: initialStatus.data ?? undefined,
    initialError: initialStatus.error,
    initialAt: Number.isFinite(generatedMs) ? generatedMs : null,
  });
  const data = status.data;
  const providers = data?.providers ?? [];
  const up = providers.filter((provider) => provider.status === "up").length;
  const down = providers.filter((provider) => provider.status === "down").length;
  const stale = providers.filter((provider) => provider.stale).length;
  const unknown = providers.filter((provider) => provider.status == null).length;
  const animeProviders = Object.values(data?.anime_server?.providers ?? {});
  const animeUp = animeProviders.filter((provider) => provider.status === "up").length;

  return (
    <div className="landing-page min-h-svh">
      <main className="live-shell mx-auto flex w-full max-w-[1320px] flex-col px-5 pb-16 pt-24 sm:px-8 lg:px-10 lg:pt-28">
        <header className="live-masthead">
          <div className="live-title">
            <div className="live-kicker"><Logo className="size-7" /><span>Kitsu Live</span></div>
            <h1>Service overview</h1>
            <p>API, bot, and provider health across the live network.</p>
          </div>
          <div className="live-toolbar">
            <div className={`live-verdict live-verdict-${data?.verdict.state ?? (status.error ? "unavailable" : "unknown")}`}>
              <span aria-hidden />
              <div><strong>{data ? stateLabel[data.verdict.state] : status.error ? "Monitoring unavailable" : "Connecting"}</strong><small>{data ? "Public status" : "Live service data"}</small></div>
            </div>
            <RefreshControls hours={hours} onHours={setHours} paused={paused} onPaused={setPaused} onRefresh={status.refresh} updatedAt={status.updatedAt} live={status.error === null} refreshing={status.refreshing} />
          </div>
        </header>

        {status.error && !data ? (
          <section className="live-unavailable" role="alert">
            <div><span>Connection state</span><strong>Last status check could not reach Kitsu</strong></div>
            <p>{status.error}</p>
            <button type="button" onClick={status.refresh}>Retry connection <ArrowRight className="size-4" aria-hidden /></button>
          </section>
        ) : null}
        {!status.error && !data ? <PanelLoading lines={5} /> : null}
        {status.error && data ? <p className="live-refresh-warning" role="status">Latest successful snapshot retained. Refresh failed: {status.error}</p> : null}

        {data ? (
          <>
            <section className="live-status-grid" aria-label="Current service health">
              <article className="live-stat live-stat-primary">
                <div className="live-stat-label"><Activity className="size-4" aria-hidden /><span>Core API</span></div>
                <div className="live-stat-state"><StatusBadge status={data.api.status} /></div>
                <dl><div><dt>Mean latency</dt><dd>{formatMs(data.api.latency_ms)}</dd></div><div><dt>P95</dt><dd>{formatMs(data.api.p95_latency_ms)}</dd></div></dl>
                <small>Process uptime {formatDuration(data.api.uptime_seconds)} · {formatPercent(data.api.uptime.coverage_percent)} coverage</small>
              </article>
              <article className="live-stat">
                <div className="live-stat-label"><Bot className="size-4" aria-hidden /><span>Telegram bot</span></div>
                <div className="live-stat-state"><StatusBadge status={data.bot.status} /></div>
                <dl><div><dt>Probe</dt><dd>{formatMs(data.bot.latency_ms)}</dd></div><div><dt>Uptime</dt><dd>{formatPercent(data.bot.uptime.uptime_percent)}</dd></div></dl>
                <small>{data.bot.status === "disabled" ? "Not configured, not an outage" : `${formatPercent(data.bot.uptime.coverage_percent)} of the range covered`}</small>
              </article>
              <article className="live-stat">
                <div className="live-stat-label"><Server className="size-4" aria-hidden /><span>Providers</span></div>
                <div className="live-stat-number">{providers.length ? `${up}/${providers.length}` : "—"}<small>up</small></div>
                <dl><div><dt>Down</dt><dd>{down}</dd></div><div><dt>Stale</dt><dd>{stale}</dd></div><div><dt>No data</dt><dd>{unknown}</dd></div></dl>
                <small>Inventory <StatusBadge status={data.inventory_status} /></small>
              </article>
              <article className="live-stat">
                <div className="live-stat-label"><Clock className="size-4" aria-hidden /><span>Monitoring</span></div>
                <div className="live-stat-number">{formatNumber(data.history.length)}<small>samples</small></div>
                <dl><div><dt>Cadence</dt><dd>{data.sample_interval_seconds}s</dd></div><div><dt>Range</dt><dd>{data.history_hours}h</dd></div></dl>
                <small>{data.persistent_history ? "Persistent history" : "History resets on restart"}</small>
              </article>
            </section>

            <section className="live-assessment">
              <div><span>Current assessment</span><strong>{stateLabel[data.verdict.state]}</strong></div>
              <ul>{data.verdict.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <small>Snapshot generated {formatUtc(data.generated_at)} · UTC</small>
            </section>

            <section className="live-primary-grid">
              <div className="live-chart-panel">
                <div className="live-section-head"><div><span>Response time</span><h2>API latency</h2></div><small>Mean / P95 · UTC</small></div>
                <TimeSeriesChart points={data.history.map((sample) => ({ t: sample.t, values: { mean: sample.api.latency_ms, p95: sample.api.p95_latency_ms } }))} series={[{ key: "mean", label: "Mean", color: "#f0f0f0" }, { key: "p95", label: "P95", color: "#777777" }]} formatY={(value) => `${Math.round(value)} ms`} height={268} />
              </div>

              <div className="live-provider-panel">
                <div className="live-section-head"><div><span>Latest inventory</span><h2>Providers</h2></div><small>As of {formatUtc(data.probe_at)}</small></div>
                <div className="live-provider-list">
                  {providers.length ? providers.map((provider) => (
                    <div key={provider.name}><span>{provider.name}</span><strong>{formatMs(provider.latency_ms)}</strong><StatusBadge status={provider.status} stale={provider.stale} /></div>
                  )) : <p>No provider data in the latest snapshot.</p>}
                </div>
                <Link className="live-text-link" href="/status">Open full status <ArrowRight className="size-4" aria-hidden /></Link>
              </div>
            </section>

            <section className="live-timeline-grid">
              <div><div className="live-section-head"><div><span>{data.history_hours} hour history</span><h2>API availability</h2></div><small>Sampled every {data.sample_interval_seconds}s</small></div><StatusTimeline points={data.history.map((sample) => ({ t: sample.t, status: toTimelineStatus(sample.api.status) }))} /></div>
              <div><div className="live-section-head"><div><span>{data.history_hours} hour history</span><h2>Telegram bot</h2></div><small>{formatPercent(data.bot.uptime.coverage_percent)} coverage</small></div><StatusTimeline points={data.history.map((sample) => ({ t: sample.t, status: toTimelineStatus(sample.bot.status) }))} /></div>
            </section>

            <section className="live-dante">
              <div className="live-dante-title"><div><span>Playback service</span><h2>Dante</h2></div><StatusBadge status={data.anime_server?.status} stale={data.anime_server?.stale} /></div>
              <div className="live-dante-summary"><strong>{formatMs(data.anime_server?.latency_ms)}</strong><span>reference probe</span><span>{animeProviders.length ? `${animeUp}/${animeProviders.length} sources up` : "No source data"}</span></div>
              <div className="live-source-list">{animeProviders.length ? Object.entries(data.anime_server?.providers ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, provider]) => <div key={name}><span>{name}</span><StatusBadge status={provider.status} stale={provider.stale} /><strong>{formatMs(provider.latency_ms)}</strong></div>) : <p>No anime playback probe has completed yet.</p>}</div>
            </section>

            {data.transitions.length > 0 ? (
              <section className="live-transitions"><div className="live-section-head"><div><span>Selected range</span><h2>Recent state changes</h2></div></div>{data.transitions.slice(0, 8).map((change, index) => <div className="live-transition" key={`${change.t}-${change.name}-${index}`}><time>{formatUtc(change.t)}</time><strong>{change.name}</strong><StatusBadge status={change.from} /><span>→</span><StatusBadge status={change.to} /></div>)}</section>
            ) : null}

            <footer className="live-footer">
              <div><Logo className="size-8" /><strong>Kitsu Live</strong></div>
              <p>Audience totals stay in the private owner dashboard.</p>
              <nav aria-label="Informational pages"><Link href="/status">Status</Link><Link href="/bot">Bot</Link><Link href="/blog">Blog</Link><Link href="/faq">FAQ</Link><Link href="/privacy">Privacy</Link><Link href="/guidelines">Guidelines</Link><Link href="/profile">Profile</Link></nav>
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}
