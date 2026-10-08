import {
  BackendError,
  clampHours,
  getAdminOverview,
  getHealth,
  getMonitoring,
  getPrometheus,
  shapeMonitoringResponse,
} from "@/lib/kitsu/client";
import type {
  AdminOverview,
  MonitoringResponse,
  PrometheusData,
} from "@/lib/kitsu/types";
import OverviewView, { type Initial } from "./view";

export const metadata = {
  title: "Overview · Kitsu dev",
};

function pick<T>(r: PromiseSettledResult<T>): Initial<T> {
  if (r.status === "fulfilled") return { data: r.value, error: null };
  const reason = r.reason;
  const code =
    reason instanceof BackendError && reason.status === 503
      ? "not-configured"
      : null;
  return {
    data: null,
    error: reason instanceof Error ? reason.message : "Request failed.",
    code,
  };
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const hours = clampHours((await searchParams).hours);
  const [monitoring, metrics, health, admin] = await Promise.allSettled([
    getMonitoring(hours).then(shapeMonitoringResponse),
    getPrometheus(),
    getHealth(),
    getAdminOverview(),
  ]);

  return (
    <OverviewView
      initialHours={hours}
      initialMonitoring={pick<MonitoringResponse>(monitoring)}
      initialMetrics={pick<PrometheusData>(metrics)}
      initialHealth={pick<{ status: string }>(health)}
      initialAdmin={pick<AdminOverview>(admin)}
    />
  );
}
