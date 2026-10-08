import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { parseBlogPost, type BlogFeed, type BlogPost } from "@/lib/blog";
import { isOwnerUser } from "@/lib/owner";
import { verifyTelegramInitData } from "@/lib/telegram-auth";
import {
  BACKEND_TIMEOUT_MS,
  adminToken,
  backendBaseUrl,
} from "@/lib/kitsu/client";

export const dynamic = "force-dynamic";

function apiError(error: string, status: number): NextResponse {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function boundedInteger(value: string | null, fallback: number, max: number) {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  return Math.min(Number(value), max);
}

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const limit = Math.max(1, boundedInteger(params.get("limit"), 50, 100));
  const offset = boundedInteger(params.get("offset"), 0, 10000);
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}/api/blog/posts?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
  } catch {
    return apiError("The blog feed is temporarily unavailable.", 502);
  }
  if (!response.ok) {
    return apiError(
      response.status === 503
        ? "Blog storage is not available right now."
        : "Could not load blog posts from the backend.",
      response.status === 503 ? 503 : 502
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return apiError("The backend returned an invalid blog feed.", 502);
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload) ||
    !("items" in payload) ||
    !Array.isArray(payload.items) ||
    !("total" in payload) ||
    typeof payload.total !== "number" ||
    !Number.isSafeInteger(payload.total) ||
    payload.total < 0
  ) {
    return apiError("The backend returned an invalid blog feed.", 502);
  }
  const items: BlogPost[] = [];
  for (const value of payload.items) {
    const post = parseBlogPost(value);
    if (post === null) {
      return apiError("The backend returned an invalid blog post.", 502);
    }
    items.push(post);
  }
  const feed: BlogFeed = {
    items,
    total: payload.total,
    limit,
    offset,
    has_more: offset + items.length < payload.total,
  };
  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}

async function ownerSession(
  request: Request,
  initData: string
): Promise<NextResponse | null> {
  const session = await getRequestSession(request);
  if (session === null) return apiError("Sign in required.", 401);
  if (initData) {
    const identity = verifyTelegramInitData(
      initData,
      process.env.KITSU_BOT_TOKEN ?? ""
    );
    if (!identity) {
      return apiError(
        "Could not verify this Telegram account. Reopen Kitsu in Telegram and try again.",
        401
      );
    }
    if (identity.userId !== session.userId) {
      return apiError("The signed-in account does not match this Telegram account.", 403);
    }
  }
  if (!isOwnerUser(session.userId)) {
    return apiError("Only the bot owner can manage blog posts.", 403);
  }
  return null;
}

async function readBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parsePostInput(value: unknown) {
  const body = record(value);
  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return null;
  }
  const title = body.title.trim();
  const content = body.body.trim();
  if (title.length < 1 || title.length > 160 || content.length < 1 || content.length > 10000) {
    return null;
  }
  return { title, body: content };
}

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await readBody(request);
  const submitted = record(payload);
  const initData = typeof submitted?.initData === "string" ? submitted.initData : "";
  const denied = await ownerSession(request, initData);
  if (denied) return denied;
  const input = parsePostInput(payload);
  if (!input) {
    return apiError("A title and body are required (up to 160 and 10,000 characters).", 400);
  }
  return proxyOwnerWrite("/api/owner/blog/posts", "POST", input);
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const body = record(await readBody(request));
  const initData = typeof body?.initData === "string" ? body.initData : "";
  const denied = await ownerSession(request, initData);
  if (denied) return denied;
  const postId = typeof body?.postId === "string" ? body.postId : "";
  const input = parsePostInput(body);
  if (!/^[0-9a-f]{32}$/.test(postId) || !input) {
    return apiError("A valid owner post, title, and body are required.", 400);
  }
  return proxyOwnerWrite(
    `/api/owner/blog/posts/${postId}`,
    "PATCH",
    input
  );
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const body = record(await readBody(request));
  const initData = typeof body?.initData === "string" ? body.initData : "";
  const denied = await ownerSession(request, initData);
  if (denied) return denied;
  const postId = typeof body?.postId === "string" ? body.postId : "";
  if (!/^[0-9a-f]{32}$/.test(postId)) {
    return apiError("A valid owner post is required.", 400);
  }
  return proxyOwnerWrite(`/api/owner/blog/posts/${postId}`, "DELETE");
}

async function proxyOwnerWrite(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: { title: string; body: string }
): Promise<NextResponse> {
  const token = adminToken();
  if (!token) {
    return apiError("Blog management is not configured on the server.", 503);
  }

  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return apiError("The blog backend is temporarily unreachable.", 502);
  }
  if (!response.ok) {
    if (response.status === 404) return apiError("Blog post not found.", 404);
    if (response.status === 401 || response.status === 403) {
      return apiError("The backend refused the blog management credential.", 502);
    }
    if (response.status === 422) {
      return apiError("The backend rejected the blog post content.", 400);
    }
    return apiError("The backend could not save that blog post.", 502);
  }

  if (response.status === 204) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    return apiError("The backend returned an invalid save response.", 502);
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
