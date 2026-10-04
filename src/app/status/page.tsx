import {
  clampHours,
  getMonitoring,
  sanitizePublicStatus,
} from "@/lib/kitsu/client";
import StatusView from "./view";

export const metadata = {
  title: "Status · Kitsu",
  description: "Public Kitsu service status: API, Telegram bot, and providers.",
};

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const hours = clampHours((await searchParams).hours);
  let data = null;
  let error: string | null = null;
  try {
    data = sanitizePublicStatus(await getMonitoring(hours));
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed.";
  }

  return <StatusView initialHours={hours} initialStatus={{ data, error }} />;
}
