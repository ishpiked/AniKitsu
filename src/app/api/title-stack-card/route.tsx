import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import {
  fontArrayBuffer,
  loadFonts,
  loadPoster,
  safePosterUrl,
} from "@/lib/bot-card-assets";
import {
  TitleStackCardImage,
  type TitleStackCardInput,
  type TitleStackCardTitle,
} from "@/lib/title-stack-card-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 48 * 1024;
const CARD_SIZE = { width: 1440, height: 900 };

function apiError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { endpoint: "title-stack-card", acceptedMethod: "POST" },
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
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, limit: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit)
    : "";
}

function integer(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

function parseInput(value: unknown): TitleStackCardInput | null {
  const body = record(value);
  if (!body || !["recommendations", "trending"].includes(String(body.kind))) {
    return null;
  }

  const titlesValue = Array.isArray(body.titles) ? body.titles.slice(0, 10) : [];
  const titles = titlesValue.flatMap((value, index): TitleStackCardTitle[] => {
    const item = record(value);
    if (!item || (item.mediaType !== "movie" && item.mediaType !== "series")) {
      return [];
    }
    const title = text(item.title, 80);
    if (!title) return [];
    const genres = Array.isArray(item.genres)
      ? item.genres.slice(0, 2).map((genre) => text(genre, 36)).filter(Boolean)
      : [];
    const rating = typeof item.rating === "number" && Number.isFinite(item.rating)
      ? Math.min(10, Math.max(0, item.rating))
      : 0;
    return [{
      title,
      mediaType: item.mediaType,
      year: text(item.year, 12),
      posterUrl: safePosterUrl(item.posterUrl),
      rating,
      rank: integer(item.rank, 10) || index + 1,
      genres,
    }];
  });

  if (titles.length === 0) return null;
  return {
    kind: body.kind as TitleStackCardInput["kind"],
    titles,
  };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.WRAP_CARD_SECRET ?? "";
  if (!secret) return apiError("Card rendering is not configured.", 503);

  const authorization = request.headers.get("authorization") ?? "";
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return apiError("Unauthorized.", 401);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return apiError("Card data is too large.", 413);
  }

  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return apiError("Card data is too large.", 413);
    }
    payload = JSON.parse(body);
  } catch {
    return apiError("Card data is invalid.", 400);
  }

  const data = parseInput(payload);
  if (!data) return apiError("Card data is incomplete.", 400);

  const posters = await Promise.all(data.titles.map((item) => loadPoster(item.posterUrl)));
  data.titles = data.titles.map((item, index) => ({
    ...item,
    posterData: posters[index],
  }));
  const [regularFont, boldFont] = await loadFonts();

  return new ImageResponse(<TitleStackCardImage data={data} />, {
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
