"use client";

import * as React from "react";
import {
  loginWithTelegram,
  loginWithTelegramWebApp,
} from "@/app/actions/auth";

interface TelegramLoginUser {
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
        initData?: string;
        ready?: () => void;
      };
    };
    onTelegramAuth?: (user: TelegramLoginUser) => void;
  }
}

export function TelegramLogin({ botUsername }: { botUsername: string }) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [webAppInitData, setWebAppInitData] = React.useState("");
  const lastWebAppAttempt = React.useRef("");
  const username = botUsername.trim().replace(/^@/, "");
  const validBotUsername = /^[A-Za-z0-9_]{5,32}$/.test(username);

  const submitWebAppLogin = React.useCallback((initData: string, retry = false) => {
    if (!retry && lastWebAppAttempt.current === initData) return;
    lastWebAppAttempt.current = initData;
    setWebAppInitData(initData);
    setLoading(true);
    setError(null);
    void loginWithTelegramWebApp(initData)
      .then((result) => {
        if (result?.error) setError(result.error);
      })
      .catch(() => {
        setError("Telegram sign in could not be completed. Try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const webApp = window.Telegram?.WebApp;
    try {
      webApp?.ready?.();
    } catch {
      // The native Web App bridge is unavailable in older Telegram clients.
    }
    if (webApp?.initData) {
      submitWebAppLogin(webApp.initData);
      return;
    }
    if (!validBotUsername) return;

    window.onTelegramAuth = (user) => {
      setLoading(true);
      setError(null);
      void loginWithTelegram(user)
        .then((result) => {
          if (result?.error) setError(result.error);
        })
        .catch(() => {
          setError("Telegram sign in could not be completed. Try again.");
        })
        .finally(() => setLoading(false));
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = username;
    script.dataset.size = "large";
    script.dataset.userpic = "false";
    script.dataset.onauth = "onTelegramAuth(user)";
    script.onerror = () => {
      setError("Telegram sign in could not be loaded. Check your connection and try again.");
    };
    mount.replaceChildren(script);

    return () => {
      mount.replaceChildren();
      delete window.onTelegramAuth;
    };
  }, [username, validBotUsername, submitWebAppLogin]);

  const displayedError = error ?? (
    validBotUsername || webAppInitData
      ? null
      : "Telegram sign in is not configured for this website."
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={mountRef} className="min-h-11" aria-label="Sign in with Telegram" />
      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Signing in with your Telegram account.
        </p>
      ) : null}
      {!loading && webAppInitData && error ? (
        <button
          type="button"
          className="text-sm text-primary underline underline-offset-4"
          onClick={() => submitWebAppLogin(webAppInitData, true)}
        >
          Try again
        </button>
      ) : null}
      {displayedError ? (
        <p className="max-w-sm text-center text-sm text-destructive" role="alert">
          {displayedError}
        </p>
      ) : null}
    </div>
  );
}
