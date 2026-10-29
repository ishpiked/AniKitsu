"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  LayoutDashboard,
  LayoutGrid,
  MessagesSquare,
  Server,
  Trophy,
  Users,
} from "@/lib/icons";
import { cn } from "cn";

const sections = [
  {
    label: "Workspace",
    links: [
      { href: "/profile", label: "Profile", icon: Users, exact: true },
      {
        href: "/profile/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/profile/dashboard/health", label: "Service Health", icon: Activity },
      { href: "/profile/dashboard/providers", label: "Providers", icon: Server },
    ],
  },
  {
    label: "Audience",
    links: [
      { href: "/profile/dashboard/audience", label: "Audience", icon: Users },
      { href: "/profile/dashboard/users", label: "Users", icon: Users },
      { href: "/profile/dashboard/referrals", label: "Referrals", icon: Trophy },
      {
        href: "/profile/dashboard/rooms",
        label: "Watch Together",
        icon: MessagesSquare,
      },
    ],
  },
  {
    label: "Explore",
    links: [
      { href: "/blog", label: "Blog", icon: BookOpen },
      {
        href: "/profile/dashboard/catalog",
        label: "Feature Catalog",
        icon: LayoutGrid,
      },
    ],
  },
];

export function OperatorNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Owner workspace"
      className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-3 pb-3 md:flex-col md:gap-5 md:overflow-y-auto md:overflow-x-visible md:px-4 md:pb-2 md:pt-4"
    >
      {sections.map((section) => (
        <div key={section.label} className="flex shrink-0 gap-1 md:flex-col">
          <p className="hidden px-3 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground md:block">
            {section.label}
          </p>
          {section.links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 shrink-0 snap-start items-center gap-2.5 rounded-md border border-transparent px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-white/10 bg-white text-black shadow-sm"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
