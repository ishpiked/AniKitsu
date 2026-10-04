"use client";

import * as React from "react";
import { Check, ChevronDown } from "@/lib/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Rich dropdown: icon trigger showing the current choice, popover list with
 * per-option descriptions and a check on the active item. Radix Popover
 * handles positioning, outside-click, Escape, and focus return.
 */
export function OptionDropdown({
  value,
  onChange,
  options,
  label,
  icon: Icon,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={label}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-all duration-150",
            "hover:border-foreground/20 hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&_svg]:pointer-events-none",
            className
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-normal">
              {selected ? selected.label : "Select…"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <div id={listboxId} role="listbox" aria-label={label} className="flex flex-col gap-0.5">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/60"
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{o.label}</span>
                  {o.description ? (
                    <span className="text-xs text-muted-foreground">
                      {o.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
