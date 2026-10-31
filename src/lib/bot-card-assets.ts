import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const MAX_POSTER_BYTES = 1024 * 1024;
const POSTER_HOSTS = new Set(["images.metahub.space", "image.tmdb.org"]);
const POSTER_CACHE_TTL_MS = 20 * 60 * 1000;
const POSTER_CACHE_MAX_ENTRIES = 48;

let fontDataPromise: Promise<[Buffer, Buffer]> | undefined;
const posterDataCache = new Map<
  string,
  { expiresAt: number; value: Promise<string | undefined> }
>();

export function loadFonts(): Promise<[Buffer, Buffer]> {
  fontDataPromise ??= Promise.all([
    readFile(join(process.cwd(), "public", "fonts", "BricolageGrotesque-Regular.ttf")),
    readFile(join(process.cwd(), "public", "fonts", "BricolageGrotesque-Bold.ttf")),
  ]);
  return fontDataPromise;
}

export function fontArrayBuffer(font: Buffer): ArrayBuffer {
  return font.buffer.slice(
    font.byteOffset,
    font.byteOffset + font.byteLength,
  ) as ArrayBuffer;
}

export function safePosterUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 512) return "";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !POSTER_HOSTS.has(url.hostname.toLowerCase()) ||
      url.port ||
      url.username ||
      url.password
    ) {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

async function fetchPoster(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2200),
      redirect: "error",
    });
    if (!response.ok) return undefined;

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return undefined;
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_POSTER_BYTES) return undefined;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_POSTER_BYTES) {
      return undefined;
    }

    const image = Buffer.from(bytes);
    if (contentType === "image/webp") {
      const jpeg = await sharp(image, { limitInputPixels: 20_000_000 })
        .jpeg({ quality: 84 })
        .toBuffer();
      if (jpeg.byteLength > MAX_POSTER_BYTES) return undefined;
      return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    }
    return `data:${contentType};base64,${image.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function loadPoster(url: string): Promise<string | undefined> {
  if (!url) return undefined;
  const cached = posterDataCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    posterDataCache.delete(url);
    posterDataCache.set(url, cached);
    return cached.value;
  }
  if (cached) posterDataCache.delete(url);

  const entry = {
    expiresAt: Date.now() + POSTER_CACHE_TTL_MS,
    value: fetchPoster(url),
  };
  posterDataCache.set(url, entry);
  while (posterDataCache.size > POSTER_CACHE_MAX_ENTRIES) {
    posterDataCache.delete(posterDataCache.keys().next().value as string);
  }
  const result = await entry.value;
  if (!result && posterDataCache.get(url) === entry) {
    posterDataCache.delete(url);
  }
  return result;
}
