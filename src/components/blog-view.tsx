"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteBlogPostAction,
  loadBlogFeed,
  saveBlogPostAction,
} from "@/app/blog/actions";
import type { BlogFeed, BlogPost } from "@/lib/blog";

function errorMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function BlogView({
  isOwner,
  initialFeed,
  initialError,
}: {
  isOwner: boolean;
  initialFeed: BlogFeed | null;
  initialError: string | null;
}) {
  const [posts, setPosts] = React.useState<BlogPost[]>(initialFeed?.items ?? []);
  const [loading, setLoading] = React.useState(!initialFeed && !initialError);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(initialFeed?.has_more ?? false);
  const [nextOffset, setNextOffset] = React.useState(initialFeed?.next_offset ?? 0);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [feedError, setFeedError] = React.useState<string | null>(initialError);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [imageId, setImageId] = React.useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const mutationRevision = React.useRef(0);
  const feedRequestRevision = React.useRef(0);
  const feedRequestInFlight = React.useRef(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const canManage = isOwner;

  const loadPosts = React.useCallback(
    async (offset = 0, append = false) => {
      if (feedRequestInFlight.current) return;
      feedRequestInFlight.current = true;
      const requestRevision = ++feedRequestRevision.current;
      const revision = mutationRevision.current;
      setLoading(!append);
      setLoadingMore(append);
      setFeedError(null);
      try {
        const feed = await loadBlogFeed(offset);
        const nextPosts = feed.items;
        if (
          requestRevision !== feedRequestRevision.current ||
          revision !== mutationRevision.current
        )
          return;
        setPosts((current) =>
          append ? [...current, ...nextPosts] : nextPosts
        );
        setHasMore(feed.has_more);
        setNextOffset(feed.next_offset);
      } catch (reason) {
        if (
          requestRevision !== feedRequestRevision.current ||
          revision !== mutationRevision.current
        )
          return;
        setFeedError(
          reason instanceof Error ? reason.message : "Could not load blog posts."
        );
      } finally {
        if (requestRevision === feedRequestRevision.current) {
          feedRequestInFlight.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    []
  );

  React.useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void loadPosts();
    };
    const initialLoad = !initialFeed && !initialError
      ? window.requestAnimationFrame(() => void loadPosts())
      : null;
    const timer = window.setInterval(refreshIfVisible, 60_000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      if (initialLoad !== null) window.cancelAnimationFrame(initialLoad);
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      feedRequestRevision.current += 1;
      feedRequestInFlight.current = false;
    };
  }, [initialError, initialFeed, loadPosts]);

  const clearEditor = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setImageId(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const submitPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFeedError(null);
    setSuccess(null);
    const currentEditId = editingId;
    try {
      const savedPost = await saveBlogPostAction(
        { title, body, imageId },
        currentEditId ?? undefined
      );
      mutationRevision.current += 1;
      setLoading(false);
      setLoadingMore(false);
      setPosts((current) =>
        currentEditId
          ? current.map((post) => (post.id === savedPost.id ? savedPost : post))
          : [savedPost, ...current.filter((post) => post.id !== savedPost.id)]
      );
      clearEditor();
      setSuccess(currentEditId ? "Your changes were saved." : "Your post is published.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save the post."
      );
    } finally {
      setSaving(false);
    }
  };

  const editPost = (post: BlogPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setBody(post.body);
    setImageId(post.imageId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    try {
      const response = await fetch("/api/kitsu/api/owner/blog/images", {
        method: "POST",
        headers: { "Content-Type": file.type },
        cache: "no-store",
        body: file,
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Could not upload the image (${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(errorMessage(payload, "Could not upload the image."));
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("image_id" in payload) ||
        typeof payload.image_id !== "string" ||
        !/^[0-9a-f]{24}$/.test(payload.image_id)
      ) {
        throw new Error("The backend returned an invalid image reference.");
      }
      setImageId(payload.image_id);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not upload the image."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const deletePost = async (post: BlogPost) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setFeedError(null);
    setSuccess(null);
    try {
      await deleteBlogPostAction(post.id);
      mutationRevision.current += 1;
      setLoading(false);
      setLoadingMore(false);
      if (editingId === post.id) clearEditor();
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setSuccess("The post was deleted.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not delete the post."
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <Card className="rounded-3xl border-primary/15 bg-gradient-to-br from-card to-primary/[0.035] shadow-sm shadow-primary/[0.04]">
          <CardHeader>
            <CardTitle className="text-xl">
              {editingId ? "Edit your post" : "Write a post"}
            </CardTitle>
            <CardDescription>
              Publish a note directly to the Kitsu blog. Telegram
              announcements are imported from the configured channel while
              the bot is an admin. Put the title (up to 160 characters) on
              line one and the body on following lines. Attach an optional
              JPEG, PNG, GIF, or WebP photo up to 5 MiB. Dashboard posts are
              not sent back to Telegram.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPost} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Title
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                  required
                  disabled={saving || uploadingImage}
                  placeholder="What would you like to share?"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Post
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={10000}
                  required
                  disabled={saving || uploadingImage}
                  rows={7}
                  placeholder="Write your update here."
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Image (optional, up to 5 MiB)
                <Input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={saving || uploadingImage}
                  onChange={(event) =>
                    void uploadImage(event.currentTarget.files?.[0])
                  }
                />
              </label>
              {imageId ? (
                <div className="flex flex-col gap-2">
                  <Image
                    src={`/api/blog/image/${imageId}`}
                    alt="Blog post preview"
                    width={1200}
                    height={675}
                    unoptimized
                    className="max-h-72 w-fit max-w-full rounded-md object-contain"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    disabled={saving || uploadingImage}
                    onClick={() => {
                      setImageId(null);
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                  >
                    Remove image
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || uploadingImage}>
                  {saving
                    ? "Saving…"
                    : uploadingImage
                      ? "Uploading image…"
                    : editingId
                      ? "Save changes"
                      : "Publish post"}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearEditor}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {success}
        </p>
      ) : null}

      {feedError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 break-words">{feedError}</p>
          <Button
            className="shrink-0"
            size="sm"
            variant="outline"
            onClick={() => void loadPosts()}
          >
            Retry feed
          </Button>
        </div>
      ) : null}

      {loading && posts.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex min-h-28 items-center justify-center text-sm text-muted-foreground" aria-live="polite">
            Loading Kitsu posts…
          </CardContent>
        </Card>
      ) : posts.length === 0 ? (
        feedError ? null : (
          <Card className="rounded-2xl border-dashed bg-card/70">
            <CardContent className="py-12 text-center">
              <p className="font-medium">No posts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New announcements from the Kitsu updates channel will appear
                here.
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          {loading ? (
            <p className="text-xs text-muted-foreground" role="status">
              Refreshing the feed…
            </p>
          ) : null}
          <section aria-label="Kitsu blog posts" className="grid gap-4">
            {posts.map((post) => (
              <Card key={post.id} className="rounded-2xl shadow-sm shadow-black/[0.025]">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {post.source === "telegram"
                      ? "Telegram announcement"
                      : "Owner post"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(post.publishedAt)}
                  </span>
                </div>
                <CardTitle className="text-xl leading-snug">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {post.imageId ? (
                  <Image
                    src={`/api/blog/image/${post.imageId}`}
                    alt={post.title}
                    width={1200}
                    height={675}
                    unoptimized
                    className="max-h-[28rem] w-full rounded-xl bg-muted/40 object-contain"
                  />
                ) : null}
                {post.body ? (
                  <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-7">
                    {post.body}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Open the original Telegram post for its attached media.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  {post.source === "telegram" && post.sourceUrl ? (
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                    >
                      View in Telegram
                      <ArrowRight className="size-4" aria-hidden />
                    </a>
                  ) : null}
                  {canManage && post.source === "owner" ? (
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editPost(post)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void deletePost(post)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
              </Card>
            ))}
          </section>
        </>
      )}
      {!loading && hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadPosts(nextOffset, true)}
          >
            {loadingMore ? "Loading…" : "Load older posts"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
