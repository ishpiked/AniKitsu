"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, House, ShieldAlert } from "@/lib/icons";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UtcClock } from "@/components/utc-clock";
import { cn } from "cn";

const links = [
  { href: "/", label: "Home", icon: House, exact: true },
  { href: "/status", label: "Status", icon: Activity },
  { href: "/bot", label: "Bot", icon: Bot },
  { href: "/login", label: "Dev", icon: ShieldAlert },
];

/**
 * Floating pill header (desktop) + bottom pill nav (mobile), in the shadcn
 * theme — no hardcoded dark glass. Hidden inside the operator area and the
 * login page, which have their own chrome. Hooks stay above the early
 * return (Rules of Hooks).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/dev") || pathname.startsWith("/login");

  React.useEffect(() => {
    if (hidden) return;
    document.body.classList.add("has-site-nav");
    return () => document.body.classList.remove("has-site-nav");
  }, [hidden]);

  if (hidden) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
        <div className="flex items-center gap-1 rounded-full border bg-background/80 py-1.5 pr-2 pl-3 shadow-sm backdrop-blur-xl">
          <Link href="/" className="mr-1 flex items-center gap-2">
            <Logo className="size-8" />
            <span className="text-sm font-semibold tracking-tight">Kitsu</span>
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href, exact) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(href, exact)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <UtcClock className="ml-2 hidden lg:inline-flex" />
          <span className="ml-1">
            <ThemeToggle />
          </span>
        </div>
      </header>

      <nav
        aria-label="Site"
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 sm:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        <div className="flex items-center gap-1 rounded-full border bg-background/85 px-2 py-1.5 shadow-lg backdrop-blur-xl">
          {links.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, exact) ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                isActive(href, exact)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
