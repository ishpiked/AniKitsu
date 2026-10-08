import type { Metadata } from "next";
import { BlogView } from "@/components/blog-view";
import { getCurrentSession } from "@/lib/auth";
import { isOwnerUser } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Blog · Kitsu",
  description: "Kitsu announcements, product notes, and updates from the bot owner.",
};

export default async function BlogPage() {
  const session = await getCurrentSession();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-24 pb-12 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Announcements & notes</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Kitsu Blog
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Updates posted in the Kitsu Telegram channel appear here
          automatically. The bot owner can also publish notes directly.
        </p>
      </header>
      <BlogView isOwner={session !== null && isOwnerUser(session.userId)} />
    </main>
  );
}
