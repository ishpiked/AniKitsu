"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const GROUPS: {
  id: string;
  label: string;
  items: { q: string; a: string }[];
}[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        q: "What is Kitsu?",
        a: "Kitsu is a title discovery and streaming product. Search once, race every server for the best playable source, then watch in the browser or inside Telegram, solo or in a synced room.",
      },
      {
        q: "Is Kitsu free?",
        a: "Yes. Discovery, playback, rooms, and alerts cost nothing. There is an optional donation flow through Telegram Stars if you want to support the service.",
      },
      {
        q: "Why is a title or episode missing?",
        a: "Two common reasons. First, only episodes with a passed release date are listed, so TBA, undated, and future episodes stay hidden until metadata reports them released. Second, everything depends on upstream servers, so a title with no working source right now simply has nothing playable to offer.",
      },
      {
        q: "Does Kitsu own any movies or shows?",
        a: "No. Kitsu owns no titles, artwork, subtitles, or streams. All of it comes from third-party servers and metadata providers. If an upstream source removes something, it is gone here too.",
      },
    ],
  },
  {
    id: "watching",
    label: "Watching and streams",
    items: [
      {
        q: "How do I start watching?",
        a: "Search in the Telegram bot with /stream, pick a title, season, and episode, choose a server or leave it on automatic, then open the player link. From a browser you can also use a share link someone sent you.",
      },
      {
        q: "What does automatic server selection do?",
        a: "It probes the available servers in parallel and picks the fastest playable source, falling back across a bounded set when one fails. A server you pick yourself stays preferred.",
      },
      {
        q: "A health check says a server is down, but my stream works. Why?",
        a: "Health probes test a reference title, not your title. A failed or inconclusive probe never discards a source you can still reach, so trust what plays, not what the probe says.",
      },
      {
        q: "The video buffers or fails midway. What helps?",
        a: "The player recovers from common network failures on its own and tries an alternate source where one exists. If it keeps failing, try another server or a lower quality, since the problem is usually upstream capacity.",
      },
      {
        q: "Will my position be saved?",
        a: "Yes. The player keeps local checkpoints, and watching through the Telegram Mini App also persists resume points server-side, so /continue picks up where you stopped.",
      },
      {
        q: "How do subtitles and timing work?",
        a: "Subtitle tracks come with the resolved source where available. You can adjust timing, and changes made from Telegram apply to connected viewers immediately.",
      },
      {
        q: "What is a share link, and is it safe to forward?",
        a: "Share links are signed and short-lived, with server-side checks on who may open them. Anyone holding a public link can watch it, so only forward links where you are comfortable with that.",
      },
    ],
  },
  {
    id: "rooms",
    label: "Watch Together",
    items: [
      {
        q: "How do I start a watch party?",
        a: "Use /party in Telegram or start a room from a search result, then invite people with the room link or from your group. Playback, pause, and seek stay synchronized for everyone in the room.",
      },
      {
        q: "Who controls playback in a room?",
        a: "The host does, with help from co-hosts. Group admins get host-level controls in group rooms. The host can also lock joining, remove members, skip queued titles, and toggle next-episode autoplay.",
      },
      {
        q: "What are inline personal rooms?",
        a: "Searching inline (@AniKitsuBot plus a title) in any chat gives you one owner-scoped room that only you control, even when launched from a group. You also get a private settings panel and join and leave notices by DM.",
      },
      {
        q: "Do rooms stay open forever?",
        a: "No. Idle rooms expire, and reconnecting viewers get a short grace window. Ending a party clears its session state and chat history.",
      },
      {
        q: "I was kicked or cannot join a room. Why?",
        a: "Hosts may lock joining or remove anyone, and that is their call inside their room. A membership check that fails for technical reasons is retryable and different from being refused. Otherwise, start your own room.",
      },
    ],
  },
  {
    id: "bot",
    label: "Bot and account",
    items: [
      {
        q: "How do recommendations work?",
        a: "The /recommend command looks at your recorded watch history and suggests similar titles. With no history yet, you get generic picks instead.",
      },
      {
        q: "What are title alerts?",
        a: "Daily announcements about catalog changes like top picks and premieres. They are strictly opt-in through /alerts. No preference means no alerts.",
      },
      {
        q: "What is /mystats showing me?",
        a: "Your recorded watch activity and accumulated watch time, measured from player heartbeats. It is measured playback activity, not proof of every credited second.",
      },
      {
        q: "How do I change my data or delete it?",
        a: "Playback preferences live under /settings. For anything else, including deletion requests, ask through /feedback and it will be handled.",
      },
      {
        q: "The bot does not answer. What now?",
        a: "First check the public status page to see whether the bot probe is down or merely unconfigured. If the service is up, try /ping to measure the Telegram round trip, then describe the problem through /feedback.",
      },
    ],
  },
  {
    id: "operators",
    label: "Status and operators",
    items: [
      {
        q: "What does the status page show?",
        a: "Live API, bot, and server health with latency, uptime percentages shown next to their coverage, availability timelines, and recent state changes. Gaps mean missing samples, never healthy silence.",
      },
      {
        q: "What is the dev dashboard?",
        a: "The operator area at /dev with deeper monitoring, provider detail, audience totals, and the full feature catalog. It sits behind a passphrase gate and is only for operators.",
      },
      {
        q: "I found a bug or someone breaking the rules. Where do I report it?",
        a: "Room or group issues go to the host or group admin first, since they can act fastest. Bot-wide problems, ban appeals, and rule violations go through /feedback with what happened, where, and when.",
      },
    ],
  },
];

export default function FaqPage() {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const groups = React.useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            q === "" ||
            `${item.q} ${item.a}`.toLowerCase().includes(q)
        ),
      })).filter((g) => g.items.length > 0),
    [q]
  );

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
      <div className="flex flex-col items-start gap-4">
        <Badge variant="secondary">Help</Badge>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Frequently asked questions
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
          Honest answers about watching, rooms, the bot, and the status
          pages. Type to filter.
        </p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          aria-label="Search questions"
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground" role="status">
          {q === ""
            ? `${total} questions`
            : `${total} match${total === 1 ? "" : "es"}`}
        </p>
      </div>

      <Separator />

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Nothing matches that search. Try fewer words, or ask through
              /feedback in the bot.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {groups.map((g) => (
        <section key={g.id} aria-label={g.label} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{g.label}</h2>
          <Card>
            <CardContent className="pt-2">
              <Accordion type="multiple" className="w-full">
                {g.items.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`${g.id}-${i}`}
                    className="last:border-0"
                  >
                    <AccordionTrigger className="text-left text-[15px] hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      ))}

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Still stuck?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Check live health first, then ask in the bot.
          </p>
          <span className="ml-auto flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/status">Status page</Link>
            </Button>
            <Button asChild>
              <Link href="/bot">
                Bot details
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
