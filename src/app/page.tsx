import { getMonitoring } from "@/lib/kitsu/client";
import { overallState, providerCounts } from "@/lib/kitsu/derive";
import LandingView, { type LandingStats } from "@/components/landing";

export const metadata = {
  title: "Kitsu · Find it. Resolve it. Watch it together.",
  description:
    "Kitsu is a Telegram-native title discovery and streaming engine with synced Watch Together rooms.",
};

export default async function Home() {
  let stats: LandingStats | null = null;
  try {
    const m = await getMonitoring(24);
    const counts = providerCounts(m.current.servers);
    stats = {
      providersUp: counts.up,
      providersTotal: counts.total,
      apiUptime: m.uptime.api.uptime_percent,
      apiCoverage: m.uptime.api.coverage_percent,
      apiLatency: m.current.api?.latency_ms ?? null,
      apiP95: m.current.api?.p95_latency_ms ?? null,
      botStatus: m.current.bot?.status ?? null,
      botLatency:
        m.current.bot?.status === "up"
          ? (m.current.bot.latency_ms ?? null)
          : null,
      overall: overallState(m.current).state,
      providers: Object.entries(m.current.servers ?? {})
        .map(([name, s]) => ({ name, status: s?.status ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  } catch {
    stats = null;
  }

  return <LandingView stats={stats} />;
}
