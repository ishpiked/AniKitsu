import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "@/lib/icons";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { OperatorNav } from "@/components/operator-nav";
import { logoutAction } from "@/app/actions/auth";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Owner dashboard · Kitsu",
  description: "Operator dashboard for the Kitsu Telegram streaming product.",
  robots: { index: false, follow: false },
};

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();

  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-muted/30 md:flex-row">
      <aside className="sticky top-0 z-40 flex shrink-0 flex-col border-b bg-background/90 shadow-sm backdrop-blur-xl md:h-svh md:w-64 md:border-b-0 md:border-r md:shadow-none">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:pt-6 md:pb-5">
          <Link href="/profile" className="group flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20 transition-transform group-hover:scale-105">
              <Logo className="size-8" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight">Kitsu</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Owner workspace
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <form action={logoutAction} className="md:hidden">
              <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="px-3 pb-3 md:px-3 md:pt-2">
          <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:block">
            Workspace
          </p>
          <OperatorNav />
        </div>

        <div className="hidden md:mt-auto md:flex md:flex-col md:gap-3 md:px-4 md:pb-5">
          <div className="rounded-2xl border bg-card/80 p-3">
            <p className="text-xs font-medium">Private operator area</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Service and audience data is visible only to the verified bot owner.
            </p>
          </div>
          <p className="px-1 text-[11px] leading-snug text-muted-foreground">
            Restricted area. Sign in with the Telegram account that owns the bot.
          </p>
          <Separator />
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col md:min-h-svh">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-primary/[0.035] to-transparent"
        />
        <main className="relative mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7 xl:px-10 xl:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
