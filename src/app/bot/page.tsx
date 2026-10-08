import Link from "next/link";
import { ArrowRight, Bot, ListVideo, MonitorPlay, Users } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CATALOG,
  CATALOG_GROUPS,
  type CatalogGroup,
} from "@/lib/catalog";

export const metadata = {
  title: "Telegram bot · Kitsu",
  description:
    "Everything the Kitsu Telegram bot does: search, playback, Watch Together, alerts, and owner tools.",
};

const BOT_URL = "https://t.me/AniKitsuBot";

const steps = [
  {
    title: "Open the bot",
    body: "Tap the button below or search @AniKitsuBot in Telegram, then press /start for the main menu.",
  },
  {
    title: "Search a title",
    body: "Use /stream or type @AniKitsuBot plus a title in any chat. Pick a result, season, and episode.",
  },
  {
    title: "Watch or party",
    body: "Open the player link solo, or start a Watch Together room and control playback from chat.",
  },
];

const highlights = [
  {
    icon: ListVideo,
    title: "Inline search anywhere",
    body: "Type @AniKitsuBot and a title in any chat. Insert the card to get Watch and Share buttons. Each user gets one owner-scoped personal room, even from groups.",
  },
  {
    icon: Users,
    title: "Group watch parties",
    body: "Rooms with presence, synced pause/play/seek, host and co-host tools, locks, autoplay, scheduling, and chat. Group admins get host-level controls.",
  },
  {
    icon: MonitorPlay,
    title: "A player that keeps up",
    body: "Subtitle timing adjusted from Telegram applies to connected viewers immediately. Hosts manage quality and subtitles from a private settings panel.",
  },
];

const guideSections = [
  {
    title: "1. Start a private chat",
    paragraphs: [
      "Open @AniKitsuBot in Telegram and press Start, or send /start. The bot replies with its welcome screen and buttons. If you are new, use the bot in a private chat first; Telegram may not let a bot message you until you have opened it.",
      "You can also send /help, /guide, or /status to see the bot's help and service information.",
    ],
  },
  {
    title: "2. Find a movie or series",
    paragraphs: [
      "Send /stream followed by a name, for example: /stream Spirited Away. /search followed by a name does the same kind of title search. /trending shows currently popular catalog picks.",
      "Choose the matching title from the buttons. Check the year and title so you do not pick a remake by mistake. For a series, choose a season and then an episode. Episodes with a release date in the future, or with no confirmed release date, are not offered yet.",
      "You can search from other chats too: type @AniKitsuBot, add a title, and choose a result. Sending that result adds its Watch and Share buttons to the chat.",
    ],
  },
  {
    title: "3. Open and control the player",
    paragraphs: [
      "Tap Watch or the player link on a result. Kitsu prepares a source and opens it in the web player or Telegram Mini App. Press Play if playback does not start automatically.",
      "Use the player's controls to pause, seek, enter fullscreen, and choose subtitles when those options are available. Kitsu can try another source if one fails, but a title is not guaranteed to be available from every provider.",
      "During playback, open the bot's controls for that active player to change your quality, subtitle track or on/off state, audio track, volume, or subtitle timing. These are personal viewing controls: they do not change another person's player or the shared Watch Together clock.",
    ],
  },
  {
    title: "4. Set your defaults and use your library",
    paragraphs: [
      "Send /settings and tap the controls on the screen to choose your default server, video quality, and subtitle preference. These are your own defaults and only apply when the selected source supports them; you can still change available controls for an active player.",
      "Send /track to see your recorded watch history and resume points. Open /continue to pick up where you left off, /recommend for suggestions based on your history, and /mystats for your personal watch statistics.",
      "Resume points and watch time are recorded from playback activity. They are useful estimates, not proof that a whole movie or episode was watched.",
    ],
  },
  {
    title: "5. Watch with friends",
    paragraphs: [
      "Start a supported title search, choose the title or episode, and use its Watch Together option to make a room. Send the room link to friends; they join with /join or the link. Use /party to check the room, /leave to leave it, and /end to close it when you are done.",
      "The host can give a trusted friend control with /cohost or pass the host role with /transfer. Hosts and co-hosts can use /pause, /play, /seek, /skip, /autoplay, and /schedule where available. /kick removes a participant; /lock and /unlock control whether new people can join. Group administrators have host-level controls in their group.",
      "Room participants, chat, and playback state are shown in the player. Inline searches create a personal room for the person who picked the result, even if the search started in a group. Some join/leave notices are delivered privately by Telegram.",
    ],
  },
  {
    title: "6. Alerts, help, and other buttons",
    paragraphs: [
      "Use /alerts to turn daily title alerts on or off. Alerts are opt-in; Kitsu does not enable them just because you opened the bot. /quiz starts a title quiz, /feedback sends a note to Kitsu support, /donate opens the optional Telegram Stars donation flow, and /ping checks the bot's connection to Telegram.",
      "Use /share after Kitsu has prepared a player link. Treat links like keys: who can open one depends on how it was created. For help at any time, use /help or return to this guide.",
      "A title can be missing or fail to play when catalog metadata is incomplete, an episode has not aired, or an upstream provider is unavailable. Try another title spelling, check the release date, or try again later. If the problem continues, use /feedback and include what you tapped and what happened.",
    ],
  },
];

const COMMAND_GROUPS: CatalogGroup[] = [
  "discover",
  "library",
  "party",
  "extras",
];

export default function BotPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
      {/* hero */}
      <div className="flex flex-col items-start gap-5">
        <span className="flex size-12 items-center justify-center rounded-xl border bg-muted">
          <Bot className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            The bot is the remote control
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
            Search, playback, rooms, alerts, and stats, all from chat. The web
            player handles watching; the bot handles everything around it.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <a href={BOT_URL} target="_blank" rel="noreferrer">
              Open in Telegram
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dev/catalog">Full feature catalog</Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* start */}
      <section aria-label="Getting started" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          Start in a minute
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title} className="h-full">
              <CardHeader className="pb-2">
                <Badge variant="secondary" className="w-fit tabular-nums">
                  Step {i + 1}
                </Badge>
                <CardTitle className="text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Detailed beginner guide" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            A step-by-step guide
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Follow these steps the first time you use Kitsu. You can come back
            here whenever you get stuck.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {guideSections.map((section) => (
            <Card key={section.title} className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-6 text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* highlights */}
      <section aria-label="Highlights" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          Why it works
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((h) => (
            <Card key={h.title} className="h-full">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <span className="flex size-9 items-center justify-center rounded-md border bg-muted">
                  <h.icon className="size-4" aria-hidden />
                </span>
                <CardTitle className="text-base">{h.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{h.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* command reference */}
      <section aria-label="Command reference" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            Command reference
          </h2>
          <p className="text-sm text-muted-foreground">
            Every user-facing command, with who can use it and what it needs.
            Availability depends on the title and its upstream providers.
          </p>
        </div>
        {COMMAND_GROUPS.map((groupId) => {
          const group = CATALOG_GROUPS.find((g) => g.id === groupId);
          const entries = CATALOG.filter(
            (e) => e.group === groupId && e.where.includes("Telegram")
          );
          if (!group || entries.length === 0) return null;
          return (
            <Card key={groupId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{group.label}</CardTitle>
                <CardDescription>
                  {entries.length} command{entries.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="no-scrollbar overflow-x-auto">
                <table className="w-full min-w-160 text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Command</th>
                      <th className="py-2 pr-4 font-medium">What it does</th>
                      <th className="py-2 pr-4 font-medium">Who</th>
                      <th className="py-2 font-medium">Requires / limits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b align-top last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {e.command ? (
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                              {e.command}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-medium">{e.title}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {e.who}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {[e.requires, e.limits]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
        <p className="text-sm text-muted-foreground">
          Owner and moderation commands live in the{" "}
          <Link href="/dev/catalog" className="font-medium underline">
            operator catalog
          </Link>{" "}
          (sign-in required).
        </p>
      </section>
    </div>
  );
}
