import { clampHours, getPrometheus } from "@/lib/kitsu/client";
import AudienceView from "./view";

export const metadata = {
  title: "Audience · Kitsu dev",
};

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const hours = clampHours((await searchParams).hours);
  let data = null;
  let error: string | null = null;
  try {
    data = await getPrometheus();
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed.";
  }

  return (
    <AudienceView initialHours={hours} initialMetrics={{ data, error }} />
  );
}
