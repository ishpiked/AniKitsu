import { cn } from "cn";

/** Kitsu brand mark. Served as an image so the built-in blink/whisker
 *  animations keep running without gradient-id collisions. */
export function Logo({ className }: { className?: string }) {
  return (
    // Plain <img> on purpose: next/image adds wrappers that break flex sizing
    // and cannot optimize SVGs anyway; the file stays an image so the
    // built-in CSS animations keep running.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/kitsu-logo.svg"
      alt="Kitsu logo"
      width={28}
      height={28}
      className={cn("size-7 shrink-0", className)}
    />
  );
}
