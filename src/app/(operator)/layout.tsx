import type { Metadata } from "next";
import { LogOut } from "@/lib/icons";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { OperatorNav } from "@/components/operator-nav";
import { logoutAction, requireOperator } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dev · Kitsu",
  description: "Operator dashboard for the Kitsu Telegram streaming product.",
  robots: { index: false, follow: false },
};

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOperator();

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b p-4 md:w-60 md:border-b-0 md:border-r md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Logo className="size-10" />
            <div className="flex flex-col">
              <p className="text-sm font-semibold tracking-tight">Kitsu · dev</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <OperatorNav />
        <div className="mt-auto flex flex-col gap-2">
          <Separator />
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Restricted area. Never share the operator passphrase.
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
