import {
  clampHours,
  getMonitoring,
  shapeMonitoringResponse,
} from "@/lib/kitsu/client";
import HealthView from "./view";

export const metadata = {
  title: "Service Health · Kitsu dev",
};

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const hours = clampHours((await searchParams).hours);
  let data = null;
  let error: string | null = null;
  try {
    data = shapeMonitoringResponse(await getMonitoring(hours));
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed.";
  }

  return (
    <HealthView initialHours={hours} initialMonitoring={{ data, error }} />
  );
}
