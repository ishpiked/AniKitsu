import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function BotOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#a1a1aa", marginBottom: 16 }}>
          Kitsu · Telegram bot
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          <div>The bot is</div>
          <div>the remote control</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#a1a1aa" }}>
          Search, parties, alerts, stats — all from chat
        </div>
      </div>
    ),
    { ...size }
  );
}
