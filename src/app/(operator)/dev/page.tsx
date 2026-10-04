import {
  clampHours,
  getHealth,
  getMonitoring,
  getPrometheus,
  shapeMonitoringResponse,
} from "@/lib/kitsu/client";
import type {
  MonitoringResponse,
  PrometheusData,
} from "@/lib/kitsu/types";
import OverviewView, { type Initial } from "./view";

export const metadata = {
  title: "Overview · Kitsu dev",
};

function pick<T>(r: PromiseSettledResult<T>): Initial<T> {
  if (r.status === "fulfilled") return { data: r.value, error: null };
  return {
    data: null,
    error: r.reason instanceof Error ? r.reason.message : "Request failed.",
  };
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const hours = clampHours((await searchParams).hours);
  const [monitoring, metrics, health] = await Promise.allSettled([
    getMonitoring(hours).then(shapeMonitoringResponse),
    getPrometheus(),
    getHealth(),
  ]);

  return (
    <OverviewView
      initialHours={hours}
      initialMonitoring={pick<MonitoringResponse>(monitoring)}
      initialMetrics={pick<PrometheusData>(metrics)}
      initialHealth={pick<{ status: string }>(health)}
    />
  );
}
