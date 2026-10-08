"use client";

import * as React from "react";
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
import { parseBlogPost, type BlogPost } from "@/lib/blog";

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

export function BlogView({ isOwner }: { isOwner: boolean }) {
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const loadPosts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/blog?limit=100", {
        cache: "no-store",
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Could not read the blog feed (${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(errorMessage(payload, "Could not load blog posts."));
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("items" in payload) ||
        !Array.isArray(payload.items)
      ) {
        throw new Error("The blog feed returned an unexpected response.");
      }
      const parsedPosts: BlogPost[] = [];
      for (const value of payload.items) {
        const post = parseBlogPost(value);
        if (post === null) {
          throw new Error("The blog feed contains an invalid post.");
        }
        parsedPosts.push(post);
      }
      setPosts(parsedPosts);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load blog posts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const clearEditor = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
  };

  const submitPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/blog", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...(editingId ? { postId: editingId } : {}),
          title,
          body,
        }),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Could not save the post (${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(errorMessage(payload, "Could not save the post."));
      }
      clearEditor();
      await loadPosts();
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePost = async (post: BlogPost) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      const response = await fetch("/api/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ postId: post.id }),
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        if (response.status !== 204) {
          throw new Error(`Could not delete the post (${response.status}).`);
        }
      }
      if (!response.ok) {
        throw new Error(errorMessage(payload, "Could not delete the post."));
      }
      if (editingId === post.id) clearEditor();
      await loadPosts();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not delete the post."
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit your post" : "Write a post"}
            </CardTitle>
            <CardDescription>
              Publish a note directly to the Kitsu blog. Telegram channel
              announcements are added automatically.
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
                  rows={7}
                  placeholder="Write your update here."
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving…"
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
          <Button
            className="ml-3"
            size="sm"
            variant="outline"
            onClick={() => void loadPosts()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading Kitsu posts…
        </p>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">No posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New announcements from the Kitsu updates channel will appear
              here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section aria-label="Kitsu blog posts" className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
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
                <CardTitle className="text-lg">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {post.body ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
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
                  {isOwner && post.source === "owner" ? (
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
      )}
    </div>
  );
}
