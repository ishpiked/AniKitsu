/**
 * Canonical public URL of this deployment. Used for sitemap, robots,
 * canonical links, Open Graph images, and structured data.
 * Set NEXT_PUBLIC_SITE_URL in the hosting environment; never hardcode.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
