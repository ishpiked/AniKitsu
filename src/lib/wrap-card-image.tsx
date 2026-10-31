/* eslint-disable @next/next/no-img-element */

export type WrapPalette =
  | "black"
  | "blue"
  | "violet"
  | "purple"
  | "forest"
  | "ocean"
  | "amber"
  | "light"
  | "amoled"
  | "rose";

export type WrapCardInput = {
  periodType: "month" | "year" | "all";
  periodLabel: string;
  palette: WrapPalette;
  recipientName: string;
  totalSeconds: number;
  movieSeconds: number;
  seriesSeconds: number;
  activeDays: number;
  bestStreak: number;
  titleCount: number;
  episodeCount: number;
  movieCount: number;
  seriesCount: number;
  chart: { label: string; seconds: number }[];
  topTitles: {
    title: string;
    mediaType: "movie" | "series";
    episodeCount: number;
    posterUrl: string;
    posterData?: string;
  }[];
};

type PaletteColors = {
  page: string;
  surface: string;
  raised: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
};

const PALETTES: Record<WrapPalette, PaletteColors> = {
  black: {
    page: "#050505", surface: "#0D0D0D", raised: "#191919", line: "#2B2B2B",
    text: "#FAFAFA", muted: "#C2C2C2", accent: "#C83D32", accentSoft: "#321714", accentText: "#FFFFFF",
  },
  blue: {
    page: "#08172F", surface: "#0F2750", raised: "#17376B", line: "#2B4F84",
    text: "#F4F8FF", muted: "#C3D4F3", accent: "#2F67D8", accentSoft: "#142E60", accentText: "#FFFFFF",
  },
  violet: {
    page: "#150E38", surface: "#20174F", raised: "#2B206B", line: "#4D438F",
    text: "#F8F5FF", muted: "#D0C5FA", accent: "#7048CE", accentSoft: "#2B205B", accentText: "#FFFFFF",
  },
  purple: {
    page: "#250B30", surface: "#381243", raised: "#4D1D5A", line: "#713279",
    text: "#FFF5FF", muted: "#E4C7EB", accent: "#B832A5", accentSoft: "#471843", accentText: "#FFFFFF",
  },
  forest: {
    page: "#092618", surface: "#103B25", raised: "#155333", line: "#2C6940",
    text: "#F4FFF7", muted: "#BEE6CA", accent: "#08794C", accentSoft: "#16432F", accentText: "#FFFFFF",
  },
  ocean: {
    page: "#071740", surface: "#0E285D", raised: "#14387C", line: "#2C55A5",
    text: "#F3F7FF", muted: "#BFCEF3", accent: "#0C7895", accentSoft: "#123B65", accentText: "#FFFFFF",
  },
  amber: {
    page: "#332300", surface: "#503706", raised: "#6E4D09", line: "#80600E",
    text: "#FFF9E8", muted: "#F1D890", accent: "#A55F00", accentSoft: "#65430A", accentText: "#FFFFFF",
  },
  light: {
    page: "#F4F6F5", surface: "#FFFFFF", raised: "#E7EFEA", line: "#CFDCD5",
    text: "#17201D", muted: "#4C5E5A", accent: "#176B65", accentSoft: "#D8ECE5", accentText: "#FFFFFF",
  },
  amoled: {
    page: "#000000", surface: "#050505", raised: "#111111", line: "#292929",
    text: "#F7F7F7", muted: "#C7C7C7", accent: "#FFFFFF", accentSoft: "#202020", accentText: "#000000",
  },
  rose: {
    page: "#0D0D0D", surface: "#151515", raised: "#202020", line: "#343434",
    text: "#FAF5F7", muted: "#D4C5CA", accent: "#C83D62", accentSoft: "#321421", accentText: "#FFFFFF",
  },
};

function duration(value: number): string {
  const seconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0
    ? `${hours.toLocaleString("en-US")}h ${minutes}m`
    : `${Math.max(1, minutes)}m`;
}

function count(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString("en-US");
}

function KitsuMark({ colors }: { colors: PaletteColors }) {
  return (
    <svg width="48" height="48" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="256" fill={colors.accent} />
      <path d="M183 157h45l-55 56h-29v-16c0-22 17-40 39-40Z" fill={colors.accentText} />
      <path d="M260 157h53l-56 56h-52l55-56Z" fill={colors.accentText} />
      <path d="M342 159c16 6 26 22 26 39v15h-78l52-54Z" fill={colors.accentText} />
      <path d="M144 228h224v79c0 29-23 52-52 52H196c-29 0-52-23-52-52v-79Z" fill={colors.accentText} />
      <rect x="181" y="255" width="120" height="26" rx="13" fill={colors.accent} />
      <rect x="181" y="298" width="73" height="26" rx="13" fill={colors.accent} />
    </svg>
  );
}

function PosterTile({
  title,
  mediaType,
  episodeCount,
  posterData,
  colors,
}: WrapCardInput["topTitles"][number] & { colors: PaletteColors }) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minWidth: 0,
        height: 274,
        padding: 8,
        borderRadius: 17,
        border: `1px solid ${colors.line}`,
        backgroundColor: colors.raised,
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 192,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 11,
          backgroundColor: colors.surface,
          color: colors.accent,
          fontSize: 42,
          fontWeight: 700,
        }}
      >
        {posterData ? (
          <img src={posterData} alt="" width="100%" height="100%" style={{ objectFit: "contain" }} />
        ) : title.trim().slice(0, 1).toUpperCase() || "K"}
      </div>
      <div style={{ display: "flex", color: colors.muted, fontSize: 12, marginTop: 8 }}>
        {mediaType === "series" ? "Series" : "Movie"}
      </div>
      <div
        style={{
          display: "flex",
          color: colors.text,
          fontSize: 15,
          fontWeight: 700,
          marginTop: 3,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </div>
      {mediaType === "series" && episodeCount > 0 ? (
        <div style={{ display: "flex", color: colors.muted, fontSize: 12, marginTop: 2 }}>
          {`${count(episodeCount)} episodes`}
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: PaletteColors;
}) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minWidth: 0,
        flexDirection: "column",
        justifyContent: "center",
        padding: "12px 15px",
        borderRadius: 14,
        border: `1px solid ${colors.line}`,
        backgroundColor: colors.raised,
      }}
    >
      <div style={{ display: "flex", color: colors.muted, fontSize: 13 }}>{label}</div>
      <div style={{ display: "flex", color: colors.text, fontSize: 24, fontWeight: 700, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

export function WrapCardImage({ data }: { data: WrapCardInput }) {
  const colors = PALETTES[data.palette] ?? PALETTES.black;
  const maxSeconds = Math.max(1, ...data.chart.map((entry) => entry.seconds));
  const firstName = data.recipientName.trim().split(/\s+/)[0];
  const splitTotal = data.movieSeconds + data.seriesSeconds;
  const moviePercent = splitTotal > 0
    ? Math.round((data.movieSeconds / splitTotal) * 100)
    : 0;
  const periodKind = data.periodType === "all"
    ? "All time"
    : data.periodType === "year" ? "Yearly wrap" : "Monthly wrap";
  const chartDescription = data.periodType === "month"
    ? "Watch time by week"
    : data.periodType === "all" ? "Watch time by year" : "Watch time by month";

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 24,
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: "Bricolage Grotesque",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 27,
          borderRadius: 27,
          border: `1px solid ${colors.line}`,
          backgroundColor: colors.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <KitsuMark colors={colors} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: colors.text, fontSize: 24, fontWeight: 700 }}>Kitsu</div>
              <div style={{ display: "flex", color: colors.muted, fontSize: 13, marginTop: 1 }}>
                Your personal watch wrap
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "9px 16px",
              borderRadius: 999,
              backgroundColor: colors.accentSoft,
              color: colors.accent,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {periodKind}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 318,
            alignItems: "center",
            gap: 24,
            padding: "22px 24px",
            border: `1px solid ${colors.line}`,
            borderRadius: 22,
            backgroundColor: colors.raised,
          }}
        >
          <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", color: colors.accent, fontSize: 15, fontWeight: 700 }}>
              {firstName ? `A look back for ${firstName}` : "A look back at your stories"}
            </div>
            <div
              style={{
                display: "flex",
                color: colors.text,
                fontSize: data.periodType === "all" ? 44 : 47,
                fontWeight: 700,
                letterSpacing: -1,
                marginTop: 7,
              }}
            >
              {data.periodLabel}
            </div>
            <div style={{ display: "flex", color: colors.muted, fontSize: 18, marginTop: 3 }}>
              Stories you made time for.
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 13, marginTop: 23 }}>
              <div style={{ display: "flex", color: colors.text, fontSize: 65, fontWeight: 700, letterSpacing: -2 }}>
                {duration(data.totalSeconds)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", paddingBottom: 8 }}>
                <div style={{ display: "flex", color: colors.muted, fontSize: 14 }}>watch time</div>
                <div style={{ display: "flex", color: colors.muted, fontSize: 13, marginTop: 2 }}>
                  {`${count(data.activeDays)} active days`}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", color: colors.muted, fontSize: 14, marginTop: 11 }}>
              {`${count(data.titleCount)} titles, ${count(data.episodeCount)} episodes`}
            </div>
          </div>

          <div style={{ display: "flex", width: 520, alignItems: "center", gap: 10 }}>
            {data.topTitles.length > 0 ? data.topTitles.map((entry, index) => (
              <PosterTile key={`${entry.title}-${index}`} {...entry} colors={colors} />
            )) : (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: 274,
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${colors.line}`,
                  borderRadius: 17,
                  backgroundColor: colors.surface,
                  color: colors.muted,
                  fontSize: 16,
                }}
              >
                Your next favorite story is waiting.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", height: 340, gap: 16 }}>
          <div
            style={{
              display: "flex",
              flex: 1,
              minWidth: 0,
              flexDirection: "column",
              padding: "19px 21px",
              border: `1px solid ${colors.line}`,
              borderRadius: 19,
              backgroundColor: colors.raised,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", color: colors.text, fontSize: 19, fontWeight: 700 }}>Your rhythm</div>
              <div style={{ display: "flex", color: colors.muted, fontSize: 13 }}>{chartDescription}</div>
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "flex-end",
                gap: data.chart.length > 6 ? 8 : 18,
                marginTop: 17,
              }}
            >
              {data.chart.map((entry, index) => {
                const height = Math.max(5, Math.round((entry.seconds / maxSeconds) * 151));
                return (
                  <div
                    key={`${entry.label}-${index}`}
                    style={{
                      display: "flex",
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        height: 160,
                        alignItems: "flex-end",
                        overflow: "hidden",
                        borderRadius: 8,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          width: "100%",
                          height,
                          borderRadius: 8,
                          backgroundColor: index === data.chart.length - 1 ? colors.accent : colors.line,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", color: colors.muted, fontSize: data.chart.length > 6 ? 10 : 12, marginTop: 7 }}>
                      {entry.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 548,
              flexDirection: "column",
              gap: 10,
              padding: "17px 18px",
              border: `1px solid ${colors.line}`,
              borderRadius: 19,
              backgroundColor: colors.raised,
            }}
          >
            <div style={{ display: "flex", color: colors.text, fontSize: 19, fontWeight: 700 }}>At a glance</div>
            <div style={{ display: "flex", gap: 10, height: 83 }}>
              <Metric label="Titles explored" value={count(data.titleCount)} colors={colors} />
              <Metric label="Episodes watched" value={count(data.episodeCount)} colors={colors} />
            </div>
            <div style={{ display: "flex", gap: 10, height: 83 }}>
              <Metric label="Longest streak" value={`${count(data.bestStreak)} days`} colors={colors} />
              <Metric label="Movies and series" value={`${count(data.movieCount)} and ${count(data.seriesCount)}`} colors={colors} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: colors.muted, fontSize: 13 }}>
                <div style={{ display: "flex" }}>Movie time</div>
                <div style={{ display: "flex" }}>Series time</div>
              </div>
              <div
                style={{
                  display: "flex",
                  height: 9,
                  overflow: "hidden",
                  borderRadius: 999,
                  backgroundColor: colors.surface,
                  marginTop: 7,
                }}
              >
                {splitTotal > 0 ? (
                  <>
                    <div style={{ display: "flex", width: `${moviePercent}%`, height: "100%", backgroundColor: colors.accent }} />
                    <div style={{ display: "flex", flex: 1, height: "100%", backgroundColor: colors.line }} />
                  </>
                ) : null}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: colors.text, fontSize: 15, fontWeight: 700, marginTop: 6 }}>
                <div style={{ display: "flex" }}>{duration(data.movieSeconds)}</div>
                <div style={{ display: "flex" }}>{duration(data.seriesSeconds)}</div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: colors.muted,
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex" }}>Made for you by Kitsu</div>
          <div style={{ display: "flex" }}>{periodKind}</div>
        </div>
      </div>
    </div>
  );
}
