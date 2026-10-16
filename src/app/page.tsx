import { siteUrl } from "@/lib/site";
import LandingView from "@/components/landing";

export const metadata = {
  title: "Kitsu · Find it. Resolve it. Watch it together.",
  description:
    "Kitsu is a Telegram-native title discovery and streaming engine with synced Watch Together rooms.",
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kitsu",
    url: siteUrl(),
    description:
      "Telegram-native title discovery and streaming engine with synced Watch Together rooms.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingView stats={null} />
    </>
  );
}
