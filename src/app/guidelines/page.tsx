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
    "How to use Kitsu and its API without abusing shared resources.",
};

const sections = [
  {
    n: "1",
    title: "Be decent to other people",
    body: "No harassment, hate, threats, or spam in messages to the operator or anywhere else people can see you. Disagree about a movie all you want. Do not go after the person.",
  },
  {
    n: "2",
    title: "Go easy on shared resources",
    body: "Search and metadata requests reach third-party services. Do not scrape the API, poll in a tight loop, or automate bulk requests. Abuse gets rate limited, then blocked.",
  },
  {
    n: "3",
    title: "Do not break the controls",
    body: "Do not try to bypass authentication, impersonate the owner, forge session cookies, or probe endpoints you were not given. Attempts are logged and treated as abuse, not curiosity.",
  },
  {
    n: "4",
    title: "Respect third-party services",
    body: "Catalog metadata and any future Bedrot media come from outside Kitsu. Do not use Kitsu to overload those services, resell their data, or pass around harmful content.",
  },
  {
    n: "5",
    title: "Content comes from elsewhere",
    body: "Kitsu owns no movies, shows, artwork, or subtitles. Availability, quality, and correctness belong to the services that provide them. A missing title is not something support can fix by wanting it harder.",
  },
  {
    n: "6",
    title: "Moderation and reports",
    body: "The Kitsu owner can ban accounts for spam, abuse, or breaking these rules. Report a problem through Telegram with what happened, where, and when. Do not send the same report repeatedly.",
  },
];

export default function GuidelinesPage() {
  return (
    <div className="document-page guidelines-page mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-16 pb-12 md:px-8">
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
          The short version, once more: be kind, do not scrape, and respect
          access controls.
        </p>
        <span className="ml-auto flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/privacy">Privacy policy</Link>
          </Button>
          <Button asChild>
            <Link href="/bot">
              Bot notice
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </span>
      </div>
    </div>
  );
}
