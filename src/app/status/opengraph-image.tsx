import { ImageResponse } from "next/og";
import { getMonitoring } from "@/lib/kitsu/client";
import {
  formatPercent,
  overallState,
  providerCounts,
} from "@/lib/kitsu/derive";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STATES: Record<string, { label: string; color: string }> = {
  operational: { label: "All systems operational", color: "#10b981" },
  degraded: { label: "Partial degradation", color: "#f59e0b" },
  down: { label: "Service disruption", color: "#ef4444" },
  unknown: { label: "Status unknown", color: "#71717a" },
};

export default async function StatusOgImage() {
  let state = "unknown";
  let detail = "Snapshot unavailable";
  try {
    const m = await getMonitoring(24);
    const verdict = overallState(m.current);
    const counts = providerCounts(m.current.servers);
    state = verdict.state;
    detail = `${counts.up}/${counts.total} providers up · ${formatPercent(m.uptime.api.uptime_percent)} API uptime · 24h`;
  } catch {
    // Fall through to the unknown card.
  }
  const view = STATES[state] ?? STATES.unknown;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#a1a1aa", marginBottom: 16 }}>
          Kitsu · live status
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: view.color,
            }}
          />
          {view.label}
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#a1a1aa" }}>
          {detail}
        </div>
      </div>
    ),
    { ...size }
  );
}
