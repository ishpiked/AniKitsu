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
        q: "What is Kitsu now?",
        a: "Kitsu is a catalog, account, and service monitoring product. Search, title and anime metadata, blog pages, and the status site remain available. The media path is being rebuilt around Bedrot, and the old streaming stack has been removed.",
      },
      {
        q: "What is Bedrot?",
        a: "Bedrot is the media server Kitsu is moving to. The previous provider, proxy, resolver, player, and room services are gone. The web app currently shows a Bedrot redesign notice while integration continues.",
      },
      {
        q: "Is Kitsu free?",
        a: "The remaining service has no paid tiers, ads, or donation flow. If that changes after the migration, it will be stated here first.",
      },
      {
        q: "Does Kitsu own any movies or shows?",
        a: "No. Metadata, artwork, and any future media come from third-party services. Kitsu does not host a media library.",
      },
    ],
  },
  {
    id: "bot",
    label: "Telegram bot",
    items: [
      {
        q: "Why does the bot not answer?",
        a: "The bot runs as a handler-free shell. It polls Telegram so monitoring can confirm the connection, but no command, message, or callback handlers are registered.",
      },
      {
        q: "What happened to the old commands?",
        a: "Search, playback, settings, alerts, live watch-history tracking, statistics, rooms, sharing, donations, and owner commands were removed with the old streaming stack. No command listed in older guides is active.",
      },
      {
        q: "Will commands return?",
        a: "A new interaction design will replace the removed commands. No date is set, and nothing is announced until it is ready.",
      },
      {
        q: "What does the bot status on the status page mean?",
        a: "It is a Telegram getMe probe. Disabled means no bot token is configured. It does not mean the bot has commands available.",
      },
    ],
  },
  {
    id: "accounts",
    label: "Accounts and data",
    items: [
      {
        q: "What does signing in show?",
        a: "Your Telegram identity, membership dates, and any watch history recorded before playback was removed. The owner account also has access to the private dashboard.",
      },
      {
        q: "Is new watch activity recorded?",
        a: "No. The player, heartbeat ingestion, and resume writes were removed. Existing watch history stays readable in account and operator views.",
      },
      {
        q: "Can I delete my data?",
        a: "Ask the operator through Telegram with the account you signed in with. There is no bot command for account deletion.",
      },
      {
        q: "Why do old watch details still appear?",
        a: "They were recorded before the migration and remain in the database so account history and operator analytics stay consistent.",
      },
    ],
  },
  {
    id: "operators",
    label: "Status and operators",
    items: [
      {
        q: "What does the status page show?",
        a: "API and Telegram bot health with latency, uptime percentages next to their coverage, availability timelines, and recent state changes. Provider panels were removed with the old streaming stack.",
      },
      {
        q: "What is in the owner dashboard?",
        a: "Service health, traffic, audience, referrals, users, and database views. Provider inventory, room control, and feature catalog pages were removed.",
      },
      {
        q: "Why is the bot marked disabled?",
        a: "No bot token is configured for that deployment. Disabled is a configuration state, not an outage.",
      },
      {
        q: "How do I report a problem?",
        a: "Contact the operator through Telegram and include what you did, what happened, and when. For availability questions, check the public status page first.",
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
    <div className="faq-page mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
      <div className="flex flex-col items-start gap-4">
        <Badge variant="secondary">Help</Badge>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Frequently asked questions
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
          Answers about the Bedrot migration, the paused Telegram bot,
          accounts, and the status pages. Type to filter.
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
              Nothing matches that search. Try fewer words, or read the bot
              notice for the current state of the service.
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
            Check live health first, then read the bot migration notice.
          </p>
          <span className="ml-auto flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/status">Status page</Link>
            </Button>
            <Button asChild>
              <Link href="/bot">
                Bot notice
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
