import {
  BackendError,
  getAdminOverview,
  getPrometheus,
} from "@/lib/kitsu/client";
import { alignAnalyticsWindow } from "@/lib/kitsu/derive";
import type {
  AdminOverview,
  PrometheusData,
} from "@/lib/kitsu/types";
import AudienceView, { type Initial } from "./view";

export const metadata = {
  title: "Audience · Kitsu dev",
};

const DEFAULT_RANGE_HOURS = 168;

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

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const sp = await searchParams;
  const hours = [168, 720, 2160].includes(Number(sp.hours))
    ? Number(sp.hours)
    : DEFAULT_RANGE_HOURS;
  const window = alignAnalyticsWindow(hours, "day");

  const [metrics, admin] = await Promise.allSettled([
    getPrometheus(),
    getAdminOverview(),
  ]);

  return (
    <AudienceView
      initialRangeHours={hours}
      initialWindow={window}
      initialMetrics={pick<PrometheusData>(metrics)}
      initialAdmin={pick<AdminOverview>(admin)}
    />
  );
}
