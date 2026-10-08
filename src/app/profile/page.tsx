import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentSession, logoutAction } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ProfileView from "@/components/profile-view";

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

      {session ? (
        <ProfileView />
      ) : (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Sign in to see your stats</CardTitle>
            <CardDescription>
              Your Kitsu watch requests and recent activity are tied to your
              Telegram account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-sm text-muted-foreground">
              Sign in with Telegram to see stats and activity associated only
              with your account. Inside the Kitsu Mini App, sign-in is automatic.
            </p>
            <Button asChild>
              <Link href="/login?next=%2Fprofile">Continue with Telegram</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
