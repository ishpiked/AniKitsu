import { siteUrl } from "@/lib/site";
import LandingView from "@/components/landing";
import {
  DEFAULT_HISTORY_HOURS,
  getMonitoring,
  sanitizePublicStatus,
} from "@/lib/kitsu/client";

export const metadata = {
  title: "Kitsu Live | Service overview",
  description:
    "Live health, uptime, and latency monitoring for Kitsu services, Telegram bots, and providers.",
};

export default async function Home() {
  let data = null;
  let error: string | null = null;
  try {
    data = sanitizePublicStatus(await getMonitoring(DEFAULT_HISTORY_HOURS));
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed.";
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kitsu Live",
    url: siteUrl(),
    description:
      "Live health, uptime, and latency monitoring for Kitsu services, Telegram bots, and providers.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingView
        initialHours={DEFAULT_HISTORY_HOURS}
        initialStatus={{ data, error }}
      />
    </>
  );
}
