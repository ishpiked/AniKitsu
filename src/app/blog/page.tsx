import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogView } from "@/components/blog-view";
import { Card, CardContent } from "@/components/ui/card";
import { currentAccount } from "@/lib/auth";
import { getBlogFeed } from "@/lib/blog-server";
import type { BlogFeed } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog · Kitsu",
  description: "Kitsu announcements, product notes, and updates from the bot owner.",
};

async function BlogPosts({ isOwner }: { isOwner: boolean }) {
  let initialFeed: BlogFeed | null = null;
  let initialError: string | null = null;
  try {
    initialFeed = await getBlogFeed();
  } catch (reason) {
    initialError = reason instanceof Error
      ? reason.message
      : "Could not load blog posts.";
  }
  return (
    <BlogView
      isOwner={isOwner}
      initialFeed={initialFeed}
      initialError={initialError}
    />
  );
}

function BlogLoading() {
  return (
    <Card className="rounded-3xl">
      <CardContent className="space-y-3 p-6">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default async function BlogPage() {
  const account = await currentAccount();
  return (
    <main className="blog-page mx-auto flex w-full max-w-5xl flex-1 flex-col gap-7 px-4 pt-24 pb-14 sm:px-6 md:gap-9">
      <header className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/[0.11] via-card to-card px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 -z-10 size-72 rounded-full bg-fuchsia-400/15 blur-3xl"
        />
        <div className="flex max-w-3xl flex-col items-start gap-3">
          <p className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary dark:text-primary">
            Announcements & notes
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Kitsu Blog
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Product updates from the Kitsu Telegram channel, alongside notes
            published directly by the owner.
          </p>
        </div>
      </header>
      <Suspense fallback={<BlogLoading />}>
        <BlogPosts isOwner={account?.isOwner === true} />
      </Suspense>
    </main>
  );
}
