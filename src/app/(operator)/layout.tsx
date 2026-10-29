import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, ShieldCheck } from "@/lib/icons";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
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
    <div className="operator-theme relative flex min-h-svh flex-col overflow-x-clip bg-background text-foreground md:flex-row">
      <aside className="operator-sidebar sticky top-0 z-40 flex shrink-0 flex-col border-b border-sidebar-border/70 bg-sidebar/95 shadow-sm backdrop-blur-xl md:h-svh md:w-72 md:border-b-0 md:border-r md:shadow-none">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:pb-6 md:pt-7">
          <Link
            href="/profile/dashboard"
            className="group flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] transition-transform group-hover:scale-105">
              <Logo className="size-9" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-base font-semibold tracking-[-0.035em]">
                Kitsu
              </span>
              <span className="text-[10px] font-medium tracking-[0.1em] text-muted-foreground">
                Owner workspace
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <form action={logoutAction} className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>

        <OperatorNav />

        <div className="hidden md:mt-auto md:flex md:flex-col md:gap-4 md:px-4 md:pb-5">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-xs font-medium">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
              Private owner area
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Service and audience data is visible only to the verified bot owner.
            </p>
          </div>
        </div>
      </aside>

      <div className="operator-workspace relative isolate flex min-h-0 min-w-0 flex-1 flex-col md:min-h-svh">
        <header className="relative z-10 flex min-h-16 items-center justify-between gap-4 border-b border-border/70 px-4 sm:px-6 xl:px-10">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Kitsu operations
            </p>
            <p className="mt-0.5 truncate text-sm font-medium">
              Owner console
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
              <ShieldCheck className="size-3.5" aria-hidden />
              Private workspace
            </span>
            <Link
              href="/"
              className="hidden rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              View site
            </Link>
            <form action={logoutAction} className="hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="relative mx-auto flex w-full max-w-[1680px] min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-10 xl:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
