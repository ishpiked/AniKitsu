import {
  BackendError,
  getAdminAnalytics,
  getAdminOverview,
  getPrometheus,
} from "@/lib/kitsu/client";
import { alignAnalyticsWindow } from "@/lib/kitsu/derive";
import type {
  AdminOverview,
  AlertAnalytics,
  AnalyticsBucket,
  AudienceAnalytics,
  PrometheusData,
  WatchTimeAnalytics,
} from "@/lib/kitsu/types";
import AudienceView, { type Initial } from "./view";

export const metadata = {
  title: "Audience · Kitsu dev",
};

const DEFAULT_RANGE_HOURS = 168;
const DEFAULT_BUCKET: AnalyticsBucket = "day";

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
  searchParams: Promise<{ hours?: string; bucket?: string }>;
}) {
  const sp = await searchParams;
  const hours = [168, 720, 2160].includes(Number(sp.hours))
    ? Number(sp.hours)
    : DEFAULT_RANGE_HOURS;
  const bucket: AnalyticsBucket =
    sp.bucket === "week" || sp.bucket === "month" ? sp.bucket : DEFAULT_BUCKET;
  const window = alignAnalyticsWindow(hours, bucket);

  const [metrics, admin, audience, watch, alerts] = await Promise.allSettled([
    getPrometheus(),
    getAdminOverview(),
    getAdminAnalytics<AudienceAnalytics["buckets"][number]>(
      "audience",
      window,
      bucket
    ),
    getAdminAnalytics<WatchTimeAnalytics["buckets"][number]>(
      "watch-time",
      window,
      bucket
    ),
    getAdminAnalytics<AlertAnalytics["buckets"][number]>(
      "alerts",
      window,
      bucket
    ),
  ]);

  return (
    <AudienceView
      initialRangeHours={hours}
      initialBucket={bucket}
      initialWindow={window}
      initialMetrics={pick<PrometheusData>(metrics)}
      initialAdmin={pick<AdminOverview>(admin)}
      initialAudience={pick<AudienceAnalytics>(audience)}
      initialWatch={pick<WatchTimeAnalytics>(watch)}
      initialAlerts={pick<AlertAnalytics>(alerts)}
    />
  );
}
