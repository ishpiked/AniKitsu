import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Shell({ children }: { children: React.ReactNode }) {
  return (
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#F32245",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          K
        </div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>Kitsu</div>
      </div>
      {children}
    </div>
  );
}

export default function RootOgImage() {
  return new ImageResponse(
    (
      <Shell>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          <div>Find it. Resolve it.</div>
          <div>Watch it together.</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "#a1a1aa" }}>
          Telegram-native title discovery and streaming
        </div>
      </Shell>
    ),
    { ...size }
  );
}
