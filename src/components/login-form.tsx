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

  const readTelegramData = React.useCallback(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    setInitData(webApp?.initData ?? "");
  }, []);

  async function signIn() {
    if (!initData || pending) return;
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
        throw new Error(`Telegram sign-in failed (${response.status}).`);
      }
      const result =
        typeof payload === "object" && payload !== null
          ? payload
          : {};
      if (!response.ok) {
        throw new Error(
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Telegram sign-in failed."
        );
      }
      if (!("isOwner" in result) || typeof result.isOwner !== "boolean") {
        throw new Error("Telegram sign-in returned unexpected data.");
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
          : "Telegram sign-in failed. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

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
            <ShieldCheck className="size-5" /> Sign in with Telegram
          </CardTitle>
          <CardDescription>
            Your profile is private to your Telegram account. The Dev dashboard
            is available only to the Kitsu owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button type="button" onClick={signIn} disabled={!initData || pending}>
            {pending ? "Verifying…" : "Continue with Telegram"}
          </Button>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {scriptFailed
              ? "Telegram sign-in could not load. Check your connection and reopen this page in Telegram."
              : initData
                ? "Telegram account detected. Continue to securely sign in."
                : "Open this page from the Kitsu app inside Telegram to continue."}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
