import { BackendError, getAdminActivity } from "@/lib/kitsu/client";
import type { ActivityResponse } from "@/lib/kitsu/types";
import ActivityView, { type Initial } from "./view";

export const metadata = {
  title: "Activity · Kitsu dev",
};

const PAGE_SIZE = 50;
const DEFAULT_HOURS = 168;

export default async function ActivityPage() {
  let initial: Initial<ActivityResponse>;
  try {
    const value = await getAdminActivity({
      entity: "all",
      entityId: null,
      eventType: null,
      hours: DEFAULT_HOURS,
      limit: PAGE_SIZE,
      offset: 0,
    });
    initial = {
      data: Array.isArray(value) ? { items: value } : (value ?? { items: [] }),
      error: null,
    };
  } catch (err) {
    initial = {
      data: null,
      error: err instanceof Error ? err.message : "Request failed.",
      code:
        err instanceof BackendError && err.status === 503
          ? "not-configured"
          : null,
    };
  }

  return (
    <ActivityView
      initialActivity={initial}
      initialEntity="all"
      initialHours={DEFAULT_HOURS}
      fetchedAt={null}
    />
  );
}
