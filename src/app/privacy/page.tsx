import Link from "next/link";
import { ArrowRight } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Privacy policy · Kitsu",
  description:
    "What Kitsu stores, what it never stores, and who can see your data. Plain words.",
};

const sections = [
  {
    n: "1",
    title: "What we store",
    body: "When you sign in with Telegram, we keep your Telegram identity and an account record with membership dates. We also keep watch history that was recorded before playback was removed. No new watch activity is written now.",
  },
  {
    n: "2",
    title: "What we never store",
    body: "We do not sell data, run ads, or use third-party analytics. We do not store payment details, and there is no donation flow while the migration is in progress.",
  },
  {
    n: "3",
    title: "Watch history",
    body: "Older watch history remains in the database so your profile and operator analytics stay consistent. The player, heartbeat ingestion, and resume writes are gone, so nothing new is recorded from playback.",
  },
  {
    n: "4",
    title: "Cookies",
    body: "Public pages do not set tracking cookies. Signing in with Telegram sets one signed, secure session cookie for your profile. The cookie identifies your account and, for the bot owner, authorizes the private dashboard.",
  },
  {
    n: "5",
    title: "Who else sees data",
    body: "Telegram sees whatever you do inside Telegram, under its own policy. Search and metadata requests reach third-party catalog services. When Bedrot integration ships, media requests will reach that server under its own terms.",
  },
  {
    n: "6",
    title: "How long we keep it",
    body: "Account records and historical watch history persist so profiles and analytics keep working. Operational snapshots roll off on a retention window of up to 90 days when durable storage is configured. Ask the operator through Telegram for deletion.",
  },
  {
    n: "7",
    title: "Nothing here is ours to keep",
    body: "Kitsu owns no movies, no shows, and no subtitles. Metadata, artwork, and any future media come from third-party services. If an upstream service removes something, it is gone here too.",
  },
  {
    n: "8",
    title: "Questions and requests",
    body: "For a data question or deletion request, contact the operator through Telegram with the account you signed in with. Include enough detail to identify the account, and do not send secrets such as login codes.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="document-page privacy-page mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
      <div className="flex flex-col items-start gap-4">
        <Badge variant="secondary">Legal</Badge>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Privacy policy
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
          Plain words, no legal fog. Short version: we store account data and
          historical watch history, we never sell anything, and new playback is
          no longer recorded.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          Last updated: November 2026
        </p>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.n} className="h-full">
            <CardHeader className="pb-2">
              <Badge variant="secondary" className="w-fit tabular-nums">
                {s.n}
              </Badge>
              <CardTitle className="text-lg">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Questions about your data? Ask the operator through Telegram.
        </p>
        <span className="ml-auto flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/bot">
              Bot notice
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/guidelines">Community guidelines</Link>
          </Button>
        </span>
      </div>
    </div>
  );
}
