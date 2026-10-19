import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BlogView } from "@/components/blog-view";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Blog · Kitsu",
  description: "Kitsu announcements, product notes, and updates from the bot owner.",
};

export default async function BlogPage() {
  const store = await cookies();
  const isOperator =
    (await verifySession(
      store.get(SESSION_COOKIE)?.value,
      process.env.DASHBOARD_SESSION_SECRET ?? ""
    )) !== null;
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-7 px-4 pt-24 pb-14 sm:px-6 md:gap-9">
      <header className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-500/[0.11] via-card to-card px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 -z-10 size-72 rounded-full bg-fuchsia-400/15 blur-3xl"
        />
        <div className="flex max-w-3xl flex-col items-start gap-3">
          <p className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
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
      <BlogView isOperator={isOperator} />
    </main>
  );
}
