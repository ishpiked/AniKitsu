import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import {
  fontArrayBuffer,
  loadFonts,
  loadPoster,
  safePosterUrl,
} from "@/lib/bot-card-assets";
import {
  WrapCardImage,
  type WrapCardInput,
} from "@/lib/wrap-card-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const CARD_SIZE = { width: 1600, height: 1000 };
const PALETTES = new Set([
  "black", "blue", "violet", "purple", "forest", "ocean", "amber", "light", "amoled", "rose",
]);

function apiError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { endpoint: "wrap-card", acceptedMethod: "POST" },
    {
      headers: {
        "Allow": "GET, HEAD, POST",
        "Cache-Control": "no-store",
      },
    },
  );
}

function safeEqual(left: string, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, limit: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit) || fallback;
}

function integer(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

function parseWrapInput(value: unknown): WrapCardInput | null {
  const body = record(value);
  if (!body || !["month", "year", "all"].includes(String(body.periodType))) {
    return null;
  }
  const periodType = body.periodType as WrapCardInput["periodType"];
  const palette = typeof body.palette === "string" && PALETTES.has(body.palette)
    ? body.palette as WrapCardInput["palette"]
    : "black";

  const chartValues = Array.isArray(body.chart) ? body.chart.slice(0, 12) : [];
  const chart = chartValues.flatMap((value) => {
    const item = record(value);
    if (!item) return [];
    return [{
      label: text(item.label, 8),
      seconds: integer(item.seconds, 100 * 366 * 24 * 60 * 60),
    }];
  });
  const titleValues = Array.isArray(body.topTitles) ? body.topTitles.slice(0, 3) : [];
  const topTitles = titleValues.flatMap((value) => {
    const item = record(value);
    if (!item || (item.mediaType !== "movie" && item.mediaType !== "series")) {
      return [];
    }
    const title = text(item.title, 80);
    if (!title) return [];
    return [{
      title,
      mediaType: item.mediaType as "movie" | "series",
      episodeCount: integer(item.episodeCount, 10000),
      posterUrl: safePosterUrl(item.posterUrl),
    }];
  });

  if (chart.length !== (periodType === "month" ? 5 : 12)) return null;
  const periodLabel = text(body.periodLabel, 32);
  if (!periodLabel) return null;

  return {
    periodType,
    periodLabel,
    palette,
    recipientName: text(body.recipientName, 40),
    totalSeconds: integer(body.totalSeconds, 100 * 366 * 24 * 60 * 60),
    movieSeconds: integer(body.movieSeconds, 100 * 366 * 24 * 60 * 60),
    seriesSeconds: integer(body.seriesSeconds, 100 * 366 * 24 * 60 * 60),
    activeDays: integer(body.activeDays, 100 * 366),
    bestStreak: integer(body.bestStreak, 100 * 366),
    titleCount: integer(body.titleCount, 1_000_000),
    episodeCount: integer(body.episodeCount, 1_000_000),
    movieCount: integer(body.movieCount, 1_000_000),
    seriesCount: integer(body.seriesCount, 1_000_000),
    chart,
    topTitles,
  };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.WRAP_CARD_SECRET ?? "";
  if (!secret) return apiError("Wrap card rendering is not configured.", 503);

  const authorization = request.headers.get("authorization") ?? "";
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return apiError("Unauthorized.", 401);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return apiError("Wrap card data is too large.", 413);
  }

  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return apiError("Wrap card data is too large.", 413);
    }
    payload = JSON.parse(body);
  } catch {
    return apiError("Wrap card data is invalid.", 400);
  }

  const data = parseWrapInput(payload);
  if (!data) return apiError("Wrap card data is incomplete.", 400);

  const posters = await Promise.all(data.topTitles.map((title) => loadPoster(title.posterUrl)));
  data.topTitles = data.topTitles.map((title, index) => ({
    ...title,
    posterData: posters[index],
  }));

  const [regularFont, boldFont] = await loadFonts();

  return new ImageResponse(<WrapCardImage data={data} />, {
    ...CARD_SIZE,
    fonts: [
      {
        name: "Bricolage Grotesque",
        data: fontArrayBuffer(regularFont),
        style: "normal",
        weight: 400,
      },
      {
        name: "Bricolage Grotesque",
        data: fontArrayBuffer(boldFont),
        style: "normal",
        weight: 700,
      },
    ],
    headers: { "Cache-Control": "private, no-store" },
  });
}
