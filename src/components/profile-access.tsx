"use client";

import * as React from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PanelError, PanelLoading } from "@/components/charts";
import ProfileView from "@/components/profile-view";

type AccessState = "checking" | "authenticated" | "browser-sign-in" | "error";

export function ProfileAccess({
  sessionUserId,
  botUsername,
}: {
  sessionUserId: number | null;
  botUsername: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<AccessState>("checking");
  const [error, setError] = React.useState<string | null>(null);
  const initDataRef = React.useRef("");
  const authenticatingRef = React.useRef(false);

  const authenticate = React.useCallback(async (initData: string) => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setState("checking");
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ initData }),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Telegram verification failed (${response.status}).`);
      }
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Telegram verification failed.";
        throw new Error(message);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("userId" in payload) ||
        typeof payload.userId !== "number" ||
        !Number.isSafeInteger(payload.userId) ||
        payload.userId <= 0
      ) {
        throw new Error("Telegram verification returned unexpected data.");
      }
      setState("authenticated");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not verify this Telegram account."
      );
      setState("error");
    } finally {
      authenticatingRef.current = false;
    }
  }, [router]);

  const readTelegramIdentity = React.useCallback(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    const initData = webApp?.initData ?? "";
    initDataRef.current = initData;
    if (initData) {
      void authenticate(initData);
    } else {
      setState(sessionUserId === null ? "browser-sign-in" : "authenticated");
    }
  }, [authenticate, sessionUserId]);

  if (state === "checking") {
    return (
      <>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
          onReady={readTelegramIdentity}
          onError={() => {
            if (sessionUserId === null) setState("browser-sign-in");
            else {
              setError("Could not verify the current Telegram account. Reload and try again.");
              setState("error");
            }
          }}
        />
        <PanelLoading lines={5} />
      </>
    );
  }

  if (state === "error") {
    return (
      <PanelError
        message={error ?? "Could not verify the current Telegram account."}
        onRetry={() => {
          if (initDataRef.current) {
            void authenticate(initDataRef.current);
          } else {
            setState("checking");
          }
        }}
      />
    );
  }

  if (state === "browser-sign-in") {
    return <LoginForm nextPath="/profile" botUsername={botUsername} />;
  }

  return <ProfileView />;
}
