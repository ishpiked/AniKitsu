import Link from "next/link";
import { ArrowRight, Bot } from "@/lib/icons";
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
  title: "Telegram bot · Kitsu",
  description:
    "The Kitsu Telegram bot is paused while the app moves to Bedrot. No commands are active.",
};

const changes = [
  {
    title: "No commands are active",
    body: "Message handlers and command handlers were removed. The bot does not answer messages, search for titles, or open a player.",
  },
  {
    title: "No player, rooms, or alerts",
    body: "Player links, the Telegram Mini App, watch parties, room chat, resume points, and title alerts are no longer part of Kitsu.",
  },
  {
    title: "Monitoring continues",
    body: "The bot process still polls Telegram so the status page can report whether the connection is healthy.",
  },
  {
    title: "The rest of Kitsu remains",
    body: "Search, metadata, blog pages, accounts, and the owner dashboard continue to run while the media path is rebuilt.",
  },
];

export default function BotPage() {
  return (
    <div className="bot-page mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
      <div className="flex flex-col items-start gap-5">
        <span className="flex size-12 items-center justify-center rounded-xl border bg-muted">
          <Bot className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            Migration notice
          </Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            The Telegram bot is paused
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
            Kitsu is moving its media path to Bedrot. The bot remains online for
            monitoring, but every user command and handler has been removed
            while the next interaction design is built.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/status">
              Check service status
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/faq">Read the FAQ</Link>
          </Button>
        </div>
      </div>

      <Separator />

      <section aria-label="What changed" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          What changed
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {changes.map((change) => (
            <Card key={change.title} className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{change.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {change.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      <section aria-label="Current availability" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          What is still available
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          The Kitsu API continues to provide catalog search, title and anime
          metadata, blog content, account sign in, and service monitoring. The
          public status page and the private owner dashboard remain online. The
          web app is a branded holding page until Bedrot integration is ready.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/">Service overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/blog">Blog</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/profile">Profile</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
