import {
  clampHours,
  getMonitoring,
  getServers,
  shapeMonitoringResponse,
} from "@/lib/kitsu/client";
import type { ServersResponse } from "@/lib/kitsu/types";
import ProvidersView from "./view";

export const metadata = {
  title: "Providers · Kitsu dev",
};

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const hours = clampHours((await searchParams).hours);
  const [monitoring, servers] = await Promise.allSettled([
    getMonitoring(hours).then(shapeMonitoringResponse),
    getServers(),
  ]);

  return (
    <ProvidersView
      initialHours={hours}
      initialMonitoring={{
        data: monitoring.status === "fulfilled" ? monitoring.value : null,
        error:
          monitoring.status === "rejected"
            ? monitoring.reason instanceof Error
              ? monitoring.reason.message
              : "Request failed."
            : null,
      }}
      initialServers={{
        data: servers.status === "fulfilled" ? (servers.value as ServersResponse) : null,
        error:
          servers.status === "rejected"
            ? servers.reason instanceof Error
              ? servers.reason.message
              : "Request failed."
            : null,
      }}
    />
  );
}
