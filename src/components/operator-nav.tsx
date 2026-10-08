"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  LayoutDashboard,
  MessagesSquare,
  Server,
  Users,
} from "@/lib/icons";
import { cn } from "cn";

const links = [
  { href: "/dev", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dev/health", label: "Service Health", icon: Activity },
  { href: "/dev/providers", label: "Providers", icon: Server },
  { href: "/dev/audience", label: "Audience", icon: Users },
  { href: "/dev/rooms", label: "Watch Together", icon: MessagesSquare },
  { href: "/dev/activity", label: "Activity", icon: Activity },
  { href: "/dev/catalog", label: "Feature Catalog", icon: BookOpen },
];

export function OperatorNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Operator"
      className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
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
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
