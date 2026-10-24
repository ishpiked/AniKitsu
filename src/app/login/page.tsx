import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { TelegramLogin } from "@/components/telegram-login";
import { currentAccount } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in · Kitsu",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await currentAccount()) redirect("/profile");
  const botUsername = process.env.KITSU_TELEGRAM_BOT_USERNAME ?? "AniKitsuBot";

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-3xl shadow-sm">
        <CardHeader className="items-center text-center">
          <Logo className="size-12" />
          <CardTitle className="text-2xl">Your Kitsu profile</CardTitle>
          <CardDescription className="max-w-xs leading-relaxed">
            Sign in with Telegram to view your account. The owner account also
            has access to the service dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <TelegramLogin botUsername={botUsername} />
          <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
            Telegram verifies your account. Kitsu never asks for your Telegram
            password or login code.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
