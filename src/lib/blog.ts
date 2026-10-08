export type BlogPostSource = "telegram" | "owner";

export interface BlogPost {
  id: string;
  source: BlogPostSource;
  title: string;
  body: string;
  sourceUrl: string | null;
  publishedAt: string;
  updatedAt: string | null;
}

export interface BlogFeed {
  items: BlogPost[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export function parseBlogPost(value: unknown): BlogPost | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const post = value as Record<string, unknown>;
  if (
    typeof post.id !== "string" ||
    post.id.length === 0 ||
    (post.source !== "telegram" && post.source !== "owner") ||
    typeof post.title !== "string" ||
    typeof post.body !== "string" ||
    typeof post.published_at !== "string" ||
    !Number.isFinite(Date.parse(post.published_at))
  ) {
    return null;
  }
  const sourceUrl =
    typeof post.source_url === "string" &&
    post.source_url.startsWith("https://t.me/")
      ? post.source_url
      : null;
  return {
    id: post.id,
    source: post.source,
    title: post.title,
    body: post.body,
    sourceUrl,
    publishedAt: post.published_at,
    updatedAt:
      typeof post.updated_at === "string" &&
      Number.isFinite(Date.parse(post.updated_at))
        ? post.updated_at
        : null,
  };
}
