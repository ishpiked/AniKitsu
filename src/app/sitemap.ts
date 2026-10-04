import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const paths = ["/", "/status", "/bot", "/faq", "/privacy", "/guidelines"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return paths.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/status" ? "hourly" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
