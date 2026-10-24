import "server-only";

import {
  parseBlogPost,
  type BlogFeed,
  type BlogPost,
} from "@/lib/blog";
import { adminToken, backendBaseUrl } from "@/lib/kitsu/client";

const BLOG_TIMEOUT_MS = 8_000;

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("The backend returned an unreadable blog response.");
  }
}

async function getBlogFeed(
  offset = 0,
  limit = 50
): Promise<BlogFeed> {
  const safeOffset = Math.max(0, Math.min(10_000, Math.floor(offset)));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const query = new URLSearchParams({
    limit: String(safeLimit),
    offset: String(safeOffset),
  });
  const url = `${backendBaseUrl()}/api/blog/posts?${query}`;
  let response: Response | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(BLOG_TIMEOUT_MS),
        headers: { accept: "application/json" },
      });
    } catch (reason) {
      if (attempt === 0 && reason instanceof Error && reason.name !== "TimeoutError") {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      throw new Error(
        reason instanceof Error && reason.name === "TimeoutError"
          ? "The blog feed took too long to respond. Try again."
          : "Kitsu could not reach the backend. Check the server connection."
      );
    }
    if (![502, 503, 504].includes(response.status) || attempt === 1) break;
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (!response) throw new Error("The blog feed is unavailable right now.");
  if (!response.ok) {
    throw new Error(
      response.status === 503
        ? "Blog storage is not available right now."
        : `The backend could not load the blog feed (${response.status}).`
    );
  }

  const payload = object(await readJson(response));
  if (
    !payload ||
    !Array.isArray(payload.items) ||
    !Number.isSafeInteger(payload.total) ||
    Number(payload.total) < 0
  ) {
    throw new Error("The backend returned an invalid blog feed.");
  }
  const items: BlogPost[] = [];
  for (const value of payload.items) {
    const post = parseBlogPost(value);
    if (post) items.push(post);
  }
  const nextOffset = safeOffset + payload.items.length;
  return {
    items,
    total: Number(payload.total),
    limit: safeLimit,
    offset: safeOffset,
    next_offset: nextOffset,
    has_more: nextOffset < Number(payload.total),
  };
}

interface BlogPostInput {
  title: string;
  body: string;
  imageId: string | null;
}

function parsePostInput(value: unknown): BlogPostInput | null {
  const input = object(value);
  if (
    !input ||
    typeof input.title !== "string" ||
    typeof input.body !== "string"
  ) {
    return null;
  }
  const title = input.title.trim();
  const body = input.body.trim();
  const imageId = input.imageId;
  if (
    !title ||
    title.length > 160 ||
    !body ||
    body.length > 10_000 ||
    (imageId !== null && imageId !== undefined &&
      (typeof imageId !== "string" || !/^[0-9a-f]{24}$/.test(imageId)))
  ) {
    return null;
  }
  return {
    title,
    body,
    imageId: typeof imageId === "string" ? imageId : null,
  };
}

async function ownerRequest(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>
): Promise<Response> {
  const token = adminToken();
  if (!token) throw new Error("Blog publishing is not configured on the server.");
  return fetch(`${backendBaseUrl()}${path}`, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(BLOG_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function saveBlogPost(
  value: unknown,
  postId?: string
): Promise<BlogPost> {
  const input = parsePostInput(value);
  if (!input || (postId && !/^[0-9a-f]{32}$/.test(postId))) {
    throw new Error("A valid title and post body are required.");
  }
  let response: Response;
  try {
    response = await ownerRequest(
      postId ? `/api/owner/blog/posts/${postId}` : "/api/owner/blog/posts",
      postId ? "PATCH" : "POST",
      {
        title: input.title,
        body: input.body,
        image_id: input.imageId,
      }
    );
  } catch {
    throw new Error("Kitsu could not reach the blog service.");
  }
  if (!response.ok) {
    throw new Error(
      response.status === 503
        ? "Blog publishing is unavailable right now."
        : `The backend could not save the post (${response.status}).`
    );
  }
  const payload = object(await readJson(response));
  const post = parseBlogPost(payload?.post);
  if (!post) throw new Error("The backend did not confirm the saved post.");
  return post;
}

async function deleteBlogPost(postId: string): Promise<void> {
  if (!/^[0-9a-f]{32}$/.test(postId)) {
    throw new Error("A valid blog post is required.");
  }
  let response: Response;
  try {
    response = await ownerRequest(`/api/owner/blog/posts/${postId}`, "DELETE");
  } catch {
    throw new Error("Kitsu could not reach the blog service.");
  }
  if (!response.ok && response.status !== 204) {
    throw new Error(
      response.status === 404
        ? "Blog post not found."
        : `The backend could not delete the post (${response.status}).`
    );
  }
}

export { deleteBlogPost, getBlogFeed, saveBlogPost };
