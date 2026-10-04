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
    body: "To make playback and rooms work, we keep your Telegram identity, playback preferences (server, quality, subtitles), watch history with resume points, alert opt-ins, and room participation. Operators can see aggregated counts, like total users, and recent activity needed for moderation.",
  },
  {
    n: "2",
    title: "What we never store",
    body: "We do not sell data, run ads, or use third-party analytics. We do not store payment details. Donations go through Telegram Stars, so Telegram handles that part, not us.",
  },
  {
    n: "3",
    title: "How watching is measured",
    body: "While you watch in the Mini App player, it sends periodic heartbeats that record watch time and your position. That is measured playback activity used for resume points and stats. It is not proof of who watched or how closely.",
  },
  {
    n: "4",
    title: "Shares and links",
    body: "Player links you share are signed and short-lived, with server-side checks on who may open them. Anyone holding a public link can watch it, so only share links where you are comfortable with that.",
  },
  {
    n: "5",
    title: "Cookies",
    body: "The public pages set no tracking cookies. The operator area (/dev) sets one signed session cookie so the passphrase gate works. Nothing else.",
  },
  {
    n: "6",
    title: "Who else sees data",
    body: "Streaming only works by asking third-party servers for video, so technical requests (like fetching a playlist segment) necessarily reach them. Telegram sees whatever you do inside Telegram, under Telegram's own policy. Nobody else gets your data.",
  },
  {
    n: "7",
    title: "How long we keep it",
    body: "Watch history and preferences persist so resume keeps working. Operational snapshots roll off on a retention window (currently up to 90 days when durable storage is configured). If you want your data removed, ask through /feedback and it will be handled.",
  },
  {
    n: "8",
    title: "Nothing here is ours to keep",
    body: "Kitsu owns no movies, no shows, and no streams. Every title, poster, and video byte comes from third-party servers and metadata providers. We are a remote control and a player shell sitting on top of them. If an upstream source goes down or removes something, it is gone here too.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
      <div className="flex flex-col items-start gap-4">
        <Badge variant="secondary">Legal</Badge>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Privacy policy
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
          Plain words, no legal fog. Short version: we store what playback
          needs, nothing else, and we never sell anything.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          Last updated: October 2026
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
          Questions about your data? Ask through /feedback in the bot.
        </p>
        <span className="ml-auto flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/bot">
              Bot details
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
