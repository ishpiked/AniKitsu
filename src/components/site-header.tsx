"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Bot, House, LayoutDashboard } from "@/lib/icons";
import { Logo } from "@/components/logo";
import { UtcClock } from "@/components/utc-clock";
import { cn } from "cn";

const links = [
  { href: "/", label: "Home", icon: House, exact: true },
  { href: "/status", label: "Status", icon: Activity },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/bot", label: "Bot", icon: Bot },
  { href: "/profile", label: "Profile", icon: LayoutDashboard },
];

/**
 * Floating pill header (desktop) + bottom pill nav (mobile), in the shadcn
 * theme — no hardcoded dark glass. Hidden inside the operator area and the
 * login page, which have their own chrome. Hooks stay above the early
 * return (Rules of Hooks).
 *
 * The Profile link is available to all visitors. Telegram sign in reveals
 * personal account data and owner tools only to the verified account.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/profile/dashboard") || pathname.startsWith("/login");

  React.useEffect(() => {
    if (hidden) return;
    document.body.classList.add("has-site-nav");
    return () => {
      document.body.classList.remove("has-site-nav");
    };
  }, [hidden]);

  if (hidden) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <div className="site-nav-shell flex h-12 items-center gap-1 px-2.5">
          <Link href="/" className="mr-1 flex items-center gap-2">
            <Logo className="size-9" />
            <span className="text-sm font-extrabold tracking-[-0.02em]">Kitsu</span>
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href, exact) ? "page" : undefined}
                className={cn(
                  "border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors",
                  isActive(href, exact)
                    ? "border-foreground text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <UtcClock className="ml-2 hidden lg:inline-flex" />
        </div>
      </header>

      <nav
        aria-label="Site"
        className="mobile-site-nav fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 sm:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        <div className="mobile-site-nav-inner flex w-full items-center justify-between gap-1 p-1.5">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mobile-site-nav-item flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-1.5 text-[10px] font-medium leading-none transition-colors",
                  active
                    ? "mobile-site-nav-item-active text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="mobile-site-nav-icon flex size-7 items-center justify-center rounded-[9px]">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
