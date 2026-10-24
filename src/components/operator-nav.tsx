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

const links = [
  { href: "/profile", label: "Profile", icon: Users, exact: true },
  { href: "/profile/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/profile/dashboard/health", label: "Service Health", icon: Activity },
  { href: "/profile/dashboard/providers", label: "Providers", icon: Server },
  { href: "/profile/dashboard/audience", label: "Audience", icon: Users },
  { href: "/profile/dashboard/users", label: "Users", icon: Users },
  { href: "/profile/dashboard/referrals", label: "Referrals", icon: Trophy },
  { href: "/profile/dashboard/rooms", label: "Watch Together", icon: MessagesSquare },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/profile/dashboard/catalog", label: "Feature Catalog", icon: LayoutGrid },
];

export function OperatorNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Owner workspace"
      className="no-scrollbar flex snap-x gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
    >
      {links.map((link) => {
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
              "flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary font-medium text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
