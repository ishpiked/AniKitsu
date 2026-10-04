"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid } from "@/lib/icons";
import { OptionDropdown } from "@/components/option-dropdown";
import {
  CATALOG,
  CATALOG_GROUPS,
  type CatalogGroup,
} from "@/lib/catalog";

export default function CatalogPage() {
  const [query, setQuery] = React.useState("");
  const [group, setGroup] = React.useState<CatalogGroup | "all">("all");

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((entry) => {
      if (group !== "all" && entry.group !== group) return false;
      if (!q) return true;
      return [entry.command, entry.title, entry.where, entry.who, entry.requires, entry.limits]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query, group]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Feature Catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          Every current Telegram capability in one searchable place. Availability
          and prerequisites are stated per feature. Nothing here executes a
          Telegram command from the web.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search features, commands, limits…"
          aria-label="Search features"
          className="max-w-sm"
        />
        <label className="sr-only" htmlFor="group">
          Feature group
        </label>
        <OptionDropdown
          value={group}
          onChange={(v) => setGroup(v as CatalogGroup | "all")}
          label="Feature group"
          icon={LayoutGrid}
          className="w-60"
          options={[
            {
              value: "all",
              label: "All groups",
              description: `${CATALOG.length} features`,
            },
            ...CATALOG_GROUPS.map((g) => ({
              value: g.id,
              label: g.label,
              description: `${CATALOG.filter((e) => e.group === g.id).length} features`,
            })),
          ]}
        />
        <span className="self-center text-xs text-muted-foreground">
          {results.length} of {CATALOG.length} features
        </span>
      </div>

      {CATALOG_GROUPS.map((g) => {
        const entries = results.filter((e) => e.group === g.id);
        if (entries.length === 0) return null;
        return (
          <section key={g.id} aria-label={g.label} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{g.label}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {entry.command ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
                          {entry.command}
                        </code>
                      ) : null}
                      {entry.title}
                    </CardTitle>
                    <CardDescription>
                      {entry.where} · {entry.who}
                      {entry.group === "operator" ? (
                        <Badge variant="destructive" className="ml-2">
                          owner only
                        </Badge>
                      ) : null}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 text-sm">
                    {entry.requires ? (
                      <p>
                        <strong className="font-medium">Requires:</strong>{" "}
                        <span className="text-muted-foreground">
                          {entry.requires}
                        </span>
                      </p>
                    ) : null}
                    {entry.limits ? (
                      <p>
                        <strong className="font-medium">Limits:</strong>{" "}
                        <span className="text-muted-foreground">
                          {entry.limits}
                        </span>
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
