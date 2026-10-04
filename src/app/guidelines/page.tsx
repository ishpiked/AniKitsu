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
  title: "Community guidelines · Kitsu",
  description:
    "How to act in Kitsu rooms, chats, and groups. One rule, then the details.",
};

const sections = [
  {
    n: "1",
    title: "Be decent to other viewers",
    body: "No harassment, hate, threats, or spam in room chat, group notices, feedback messages, or anywhere else people can see you. Disagree about a movie all you want. Do not go after the person.",
  },
  {
    n: "2",
    title: "Hosts set room rules",
    body: "Whoever starts a room runs it. Hosts and co-hosts can remove members, lock joining, and skip titles. If a host locks you out or kicks you, that is their call inside their room. Start your own room instead.",
  },
  {
    n: "3",
    title: "Share links responsibly",
    body: "A share link is a key to a stream. Do not post links somewhere they will be scraped or resold, and do not use shares to pass around harmful or abusive content. Abused links get revoked.",
  },
  {
    n: "4",
    title: "Go easy on shared resources",
    body: "Every search, probe, and proxied segment costs real upstream bandwidth. Do not scrape the backend, hammer resolution in a loop, or re-stream our proxy output as your own service. Automated abuse gets rate limited, then blocked.",
  },
  {
    n: "5",
    title: "Do not break the controls",
    body: "Do not try to bypass locks, impersonate hosts or admins, forge share tokens, or poke at endpoints you were not given. Attempts are logged and treated as abuse, not curiosity.",
  },
  {
    n: "6",
    title: "Content comes from elsewhere",
    body: "Kitsu owns nothing here. Titles, artwork, subtitles, and streams all come from third-party servers, so availability, quality, and correctness are theirs, not ours. A missing title or a dead source is not something support can fix by wanting it harder.",
  },
  {
    n: "7",
    title: "Moderation and bans",
    body: "Group admins moderate their groups. Room hosts moderate their rooms. The Kitsu owner moderates the bot itself and can ban accounts for spam, abuse, or breaking these rules. Bans can be appealed exactly once through /feedback. The decision after appeal is final.",
  },
  {
    n: "8",
    title: "Reporting problems",
    body: "See someone breaking these rules? Report it to the room host or group admin first, since they can act fastest. For bot-wide issues or ban appeals, use /feedback and include what happened, where, and when.",
  },
];

export default function GuidelinesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
      <div className="flex flex-col items-start gap-4">
        <Badge variant="secondary">Community</Badge>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Community guidelines
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
          One rule covers almost everything: do not be cruel to other people.
          Everything below is detail for the edge cases.
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
          The short version, once more: be kind, share sanely, go easy on
          shared bandwidth.
        </p>
        <span className="ml-auto flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/privacy">Privacy policy</Link>
          </Button>
          <Button asChild>
            <Link href="/bot">
              Bot details
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </span>
      </div>
    </div>
  );
}
