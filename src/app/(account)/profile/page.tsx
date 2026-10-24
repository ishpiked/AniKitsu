import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentAccount } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Profile · Kitsu",
  description: "Your Kitsu account and watch activity.",
  robots: { index: false, follow: false },
};

function count(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function dateLabel(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return "Not available";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Telegram account";
}

export default async function ProfilePage() {
  const account = await currentAccount();
  if (!account) redirect("/login");

  const profile = account.profile;
  const requests = profile.watchRequests;
  const recentWatches = profile.recentWatches;
  const fullName = displayName(account.firstName, account.lastName);
  const watchSeconds = profile.watchSeconds;
  const hoursWatched = Math.floor(watchSeconds / 3600);
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-24 pb-14 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16 ring-1 ring-border">
            {account.photoUrl ? <AvatarImage src={account.photoUrl} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {fullName}
              </h1>
              {account.isOwner ? <Badge>Bot owner</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {account.username ? `@${account.username}` : "Telegram profile"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account.isOwner ? (
            <Button asChild className="rounded-xl">
              <Link href="/profile/dashboard">Open owner dashboard</Link>
            </Button>
          ) : null}
          <form action={logoutAction}>
            <Button variant="outline" type="submit" className="rounded-xl">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Your Kitsu activity">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Titles opened</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {profile.available ? count(requests.total).toLocaleString() : "Not available"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {profile.available
              ? `${count(requests.movies)} movies and ${count(requests.series)} series`
              : "Account activity could not be loaded"}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Watch time</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {profile.available ? `${hoursWatched.toLocaleString()} hours` : "Not available"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Measured from player activity
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Member since</CardDescription>
            <CardTitle className="text-base font-semibold">
              {profile.available ? dateLabel(profile.firstSeen ?? undefined) : "Not available"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Telegram account activity
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Last active</CardDescription>
            <CardTitle className="text-base font-semibold">
              {profile.available ? dateLabel(profile.lastActive ?? undefined) : "Not available"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Telegram account activity
          </CardContent>
        </Card>
      </section>

      {!profile.available ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
            Your Telegram profile is signed in. Kitsu could not read your
            account activity from the backend during sign in.
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Recent watches</CardTitle>
          <CardDescription>Your latest titles opened in Kitsu.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentWatches.length ? (
            <ul className="divide-y rounded-2xl border">
              {recentWatches.map((watch, index) => {
                const title = watch.title || "Untitled";
                const season = count(watch.season);
                const episode = count(watch.episode);
                const episodeLabel = season && episode
                  ? `Season ${season}, episode ${episode}`
                  : watch.mediaType === "movie" ? "Movie" : "Series";
                return (
                  <li
                    key={`${watch.imdb}:${watch.updatedAt ?? index}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {episodeLabel}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {dateLabel(watch.updatedAt ?? undefined)}
                    </time>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {!profile.available
                ? "Recent watches could not be loaded while the backend connection recovers."
                : "Your recent watches will appear here after you use the Kitsu player."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Telegram identity used for your Kitsu account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Telegram ID</p>
            <p className="mt-1 font-mono tabular-nums">{account.id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Username</p>
            <p className="mt-1">{account.username ? `@${account.username}` : "Not set"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">First name</p>
            <p className="mt-1">{account.firstName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last name</p>
            <p className="mt-1">{account.lastName || "Not set"}</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
