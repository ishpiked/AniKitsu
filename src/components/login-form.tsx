"use client";

import * as React from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready?: () => void;
      };
    };
  }
}

export function LoginForm({
  nextPath,
}: {
  nextPath: "/profile" | "/dev" | null;
}) {
  const router = useRouter();
  const [initData, setInitData] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scriptFailed, setScriptFailed] = React.useState(false);
  const pendingRef = React.useRef(false);
  const autoLoginAttempted = React.useRef("");

  const readTelegramData = React.useCallback(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    setInitData(webApp?.initData ?? "");
  }, []);

  const signIn = React.useCallback(async (initData: string) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Telegram verification failed (${response.status}).`);
      }
      const result =
        typeof payload === "object" && payload !== null
          ? payload
          : {};
      if (!response.ok) {
        throw new Error(
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Telegram verification failed."
        );
      }
      if (!("isOwner" in result) || typeof result.isOwner !== "boolean") {
        throw new Error("Telegram verification returned unexpected data.");
      }
      const destination =
        nextPath === "/profile"
          ? "/profile"
          : result.isOwner
            ? "/dev"
            : "/profile";
      router.replace(destination);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Telegram verification failed. Please try again."
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [nextPath, router]);

  React.useEffect(() => {
    if (!initData || autoLoginAttempted.current === initData) return;
    autoLoginAttempted.current = initData;
    void signIn(initData);
  }, [initData, signIn]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={readTelegramData}
        onError={() => setScriptFailed(true)}
      />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" /> Opening Kitsu
          </CardTitle>
          <CardDescription>
            Your profile loads automatically from your Telegram account. The
            Dev dashboard is available only to the Kitsu owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {initData && error ? (
            <Button
              type="button"
              onClick={() => void signIn(initData)}
              disabled={pending}
            >
              {pending ? "Loading your dashboard…" : "Retry"}
            </Button>
          ) : initData && pending ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Loading your dashboard…
            </p>
          ) : (
            !initData ? <p className="text-sm text-muted-foreground">
              Open Kitsu from Telegram to load your profile automatically.
            </p> : null
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {scriptFailed
              ? "Telegram account information could not load. Check your connection and reopen Kitsu."
              : initData
                ? pending
                  ? "Using your Telegram account to open your personal Kitsu dashboard."
                  : error
                    ? "Automatic account verification did not complete. Retry above."
                    : "Telegram account detected. Loading your dashboard automatically."
                : "The Telegram account was not available on this page."}
          </p>
          {!initData ? (
            <a
              className="text-center text-sm text-primary underline-offset-4 hover:underline"
              href="https://t.me/AniKitsuBot/status"
              rel="noreferrer"
              target="_blank"
            >
              Open Kitsu in Telegram
            </a>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
