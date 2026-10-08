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

interface TelegramLoginWidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready?: () => void;
      };
    };
    onTelegramAuth?: (user: TelegramLoginWidgetUser) => void;
  }
}

export function LoginForm({
  nextPath,
  botUsername,
}: {
  nextPath: "/profile" | "/dev" | null;
  botUsername: string;
}) {
  const router = useRouter();
  const [initData, setInitData] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scriptFailed, setScriptFailed] = React.useState(false);
  const pendingRef = React.useRef(false);
  const widgetContainer = React.useRef<HTMLDivElement>(null);

  const readTelegramData = React.useCallback(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    setInitData(webApp?.initData ?? "");
  }, []);

  const signIn = React.useCallback(async (credentials: {
    initData?: string;
    authData?: TelegramLoginWidgetUser;
  }) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
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
      pendingRef.current = false;
      setPending(false);
    }
  }, [nextPath, router]);

  React.useEffect(() => {
    if (!botUsername || initData || !widgetContainer.current) return;

    const handleTelegramAuth = (user: TelegramLoginWidgetUser) => {
      void signIn({ authData: user });
    };
    window.onTelegramAuth = handleTelegramAuth;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.userpic = "false";
    script.dataset.onauth = "onTelegramAuth(user)";
    script.onerror = () => setScriptFailed(true);
    widgetContainer.current.replaceChildren(script);

    return () => {
      if (window.onTelegramAuth === handleTelegramAuth) {
        delete window.onTelegramAuth;
      }
      widgetContainer.current?.replaceChildren();
    };
  }, [botUsername, initData, signIn]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={readTelegramData}
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
          {initData ? (
            <Button
              type="button"
              onClick={() => void signIn({ initData })}
              disabled={pending}
            >
              {pending ? "Verifying…" : "Continue with Telegram"}
            </Button>
          ) : botUsername ? (
            <div
              ref={widgetContainer}
              className={`flex justify-center${pending ? " pointer-events-none opacity-60" : ""}`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Telegram sign-in is not configured. Set KITSU_BOT_USERNAME to
              enable browser sign-in.
            </p>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {scriptFailed
              ? "Telegram sign-in could not load. Check your connection and try again."
              : initData
                ? "Telegram account detected. Continue to securely sign in."
                : botUsername
                  ? "Or open Kitsu in Telegram to sign in there."
                  : "You can also open Kitsu from inside Telegram to sign in."}
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
