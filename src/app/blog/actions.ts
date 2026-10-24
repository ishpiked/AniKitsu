"use server";

import { requireOwner } from "@/lib/auth";
import {
  deleteBlogPost,
  getBlogFeed,
  saveBlogPost,
} from "@/lib/blog-server";

export async function loadBlogFeed(offset = 0) {
  const safeOffset = Number.isSafeInteger(offset)
    ? Math.max(0, Math.min(10_000, offset))
    : 0;
  return getBlogFeed(safeOffset);
}

export async function saveBlogPostAction(value: unknown, postId?: string) {
  await requireOwner();
  return saveBlogPost(value, postId);
}

export async function deleteBlogPostAction(postId: string) {
  await requireOwner();
  return deleteBlogPost(postId);
}
