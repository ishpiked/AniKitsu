import type { Metadata } from "next";
import { getCurrentSession, logoutAction } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProfileAccess } from "@/components/profile-access";

export const metadata: Metadata = {
  title: "Profile · Kitsu",
  description: "Your personal Kitsu watch and activity stats.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await getCurrentSession();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-24 pb-10 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Your account</p>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        </div>
        {session ? (
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        ) : null}
      </div>

      <ProfileAccess
        sessionUserId={session?.userId ?? null}
        botUsername={process.env.KITSU_BOT_USERNAME || "AniKitsuBot"}
      />
    </main>
  );
}
