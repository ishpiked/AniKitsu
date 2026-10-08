"use client";

import * as React from "react";
import Script from "next/script";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelLoading } from "@/components/charts";
import ProfileView from "@/components/profile-view";

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

export function ProfileAccess() {
  const [initData, setInitData] = React.useState<string | null>(null);
  const [scriptFailed, setScriptFailed] = React.useState(false);

  const readTelegramData = React.useCallback(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    setInitData(webApp?.initData || "");
  }, []);

  if (initData === null && !scriptFailed) {
    return (
      <>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
          onReady={readTelegramData}
          onError={() => setScriptFailed(true)}
        />
        <PanelLoading lines={5} />
      </>
    );
  }

  if (!initData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Kitsu in Telegram</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Personal stats are loaded automatically from your Telegram account.
            Open this dashboard in Telegram to continue; no separate sign-in is
            needed.
          </p>
          {scriptFailed ? (
            <p role="alert" className="text-destructive">
              Telegram could not be reached. Check your connection and reopen
              Kitsu from Telegram.
            </p>
          ) : null}
          <a
            href="https://t.me/AniKitsuBot/status"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-4"
          >
            Open Kitsu in Telegram
          </a>
        </CardContent>
      </Card>
    );
  }

  return <ProfileView initData={initData} />;
}
