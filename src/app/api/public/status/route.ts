import { NextResponse } from "next/server";
import {
  clampHours,
  getMonitoring,
  sanitizePublicStatus,
} from "@/lib/kitsu/client";

export const dynamic = "force-dynamic";

// Unauthenticated, deliberately narrow public surface for the /status page.
// Returns a sanitized snapshot only: no audience totals, no error/sample
// internals, no storage internals beyond the persistence flag.
const CACHE_TTL_MS = 30_000;
let cached: { at: number; hours: number; body: string } | null = null;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hours = clampHours(url.searchParams.get("hours"));

  if (cached && cached.hours === hours && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(JSON.parse(cached.body), {
      headers: {
        "x-kitsu-cache": "HIT",
        "Cache-Control": "public, max-age=20",
      },
    });
  }

  try {
    const full = await getMonitoring(hours);
    const body = JSON.stringify(sanitizePublicStatus(full));
    cached = { at: Date.now(), hours, body };
    return NextResponse.json(JSON.parse(body), {
      headers: {
        "x-kitsu-cache": "MISS",
        "Cache-Control": "public, max-age=20",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "backend unreachable" },
      { status: 502 }
    );
  }
}
