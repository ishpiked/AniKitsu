"use client";

import * as React from "react";

export function TelegramScript() {
  React.useEffect(() => {
    if (document.querySelector('script[src="https://telegram.org/js/telegram-web-app.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    document.head.appendChild(script);
  }, []);

  return null;
}
