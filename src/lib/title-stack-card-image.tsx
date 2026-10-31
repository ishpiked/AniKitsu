export type TitleStackCardKind = "recommendations" | "trending";

export type TitleStackCardTitle = {
  title: string;
  mediaType: "movie" | "series";
  year: string;
  posterUrl: string;
  rating: number;
  rank: number;
  genres: string[];
  posterData?: string;
};

export type TitleStackCardInput = {
  kind: TitleStackCardKind;
  titles: TitleStackCardTitle[];
};

const COLORS = {
  page: "#080A0C",
  surface: "#101316",
  raised: "#181C20",
  line: "#30363C",
  text: "#F5F6F7",
  muted: "#A7AFB7",
  accent: "#C83D32",
  accentSoft: "#351A18",
};

function BrandMark() {
  return (
    <div
      style={{
        display: "flex",
        width: 54,
        height: 54,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 27,
        backgroundColor: COLORS.accent,
        color: COLORS.text,
        fontSize: 31,
        fontWeight: 700,
      }}
    >
      K
    </div>
  );
}

function PosterStack({ titles }: { titles: TitleStackCardTitle[] }) {
  const posters = titles.slice(0, 5);
  const stackTitles = posters.length ? posters : [];

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 500,
        height: 470,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {stackTitles.map((item, index) => {
        const count = stackTitles.length;
        const rotation = (index - (count - 1) / 2) * 5;
        const stackWidth = 210 + (count - 1) * 58;
        const left = (500 - stackWidth) / 2 + index * 58;
        const top = 44 + (index % 2) * 18;
        return (
          <div
            key={`${item.mediaType}:${item.title}:${index}`}
            style={{
              display: "flex",
              position: "absolute",
              left,
              top,
              width: 210,
              height: 330,
              overflow: "hidden",
              borderRadius: 17,
              border: `2px solid ${COLORS.line}`,
              backgroundColor: COLORS.raised,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {item.posterData ? (
              // ImageResponse uses embedded poster data without next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.posterData}
                alt=""
                width="100%"
                height="100%"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.text,
                  fontSize: 96,
                  fontWeight: 700,
                }}
              >
                {item.title.trim().slice(0, 1).toUpperCase() || "K"}
              </div>
            )}
          </div>
        );
      })}
      {stackTitles.length === 0 ? (
        <div
          style={{
            display: "flex",
            width: 220,
            height: 330,
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${COLORS.line}`,
            borderRadius: 17,
            backgroundColor: COLORS.raised,
            color: COLORS.accent,
            fontSize: 96,
            fontWeight: 700,
            transform: "rotate(-5deg)",
          }}
        >
          K
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          bottom: 0,
          padding: "9px 13px",
          borderRadius: 8,
          backgroundColor: COLORS.accent,
          color: COLORS.text,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {stackTitles.length} POSTERS IN THE MIX
      </div>
    </div>
  );
}

function TitleRow({ item }: { item: TitleStackCardTitle }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        padding: "13px 15px",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        backgroundColor: COLORS.raised,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            display: "flex",
            width: 26,
            height: 26,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 13,
            backgroundColor: COLORS.accentSoft,
            color: COLORS.text,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {String(item.rank).padStart(2, "0")}
        </div>
        <div
          style={{
            display: "flex",
            color: COLORS.muted,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.7,
          }}
        >
          {item.mediaType === "series" ? "Series" : "Movie"}
          {item.year ? `  ·  ${item.year}` : ""}
          {item.rating > 0 ? `  ·  ${item.rating.toFixed(1)}` : ""}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 7,
          overflow: "hidden",
          color: COLORS.text,
          fontSize: 18,
          fontWeight: 700,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {item.title}
      </div>
      {item.genres.length ? (
        <div
          style={{
            display: "flex",
            marginTop: 4,
            overflow: "hidden",
            color: COLORS.muted,
            fontSize: 13,
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {item.genres.slice(0, 2).join("  ·  ")}
        </div>
      ) : null}
    </div>
  );
}

function TrendingColumns({ titles }: { titles: TitleStackCardTitle[] }) {
  const movies = titles.filter((item) => item.mediaType === "movie").slice(0, 5);
  const series = titles.filter((item) => item.mediaType === "series").slice(0, 5);
  return (
    <div style={{ display: "flex", gap: 12, width: "100%" }}>
      {[{ label: "Movies", items: movies }, { label: "Series", items: series }].map((group) => (
        <div
          key={group.label}
          style={{ display: "flex", flex: 1, flexDirection: "column", gap: 9 }}
        >
          <div
            style={{
              display: "flex",
              color: COLORS.accent,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.2,
            }}
          >
            {group.label}
          </div>
          {group.items.map((item) => <TitleRow key={`${group.label}:${item.rank}:${item.title}`} item={item} />)}
        </div>
      ))}
    </div>
  );
}

export function TitleStackCardImage({ data }: { data: TitleStackCardInput }) {
  const recommended = data.kind === "recommendations";
  const title = recommended ? "Picked for you" : "Trending now";
  const subtitle = recommended
    ? "Fresh picks shaped by what you watch."
    : "The titles drawing the most attention right now.";

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 24,
        backgroundColor: COLORS.page,
        color: COLORS.text,
        fontFamily: "Bricolage Grotesque",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          padding: "26px 30px",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 24,
          backgroundColor: COLORS.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandMark />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: COLORS.text, fontSize: 23, fontWeight: 700 }}>
                Kitsu
              </div>
              <div style={{ display: "flex", color: COLORS.muted, fontSize: 13 }}>
                Personalized discovery
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "9px 13px",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 10,
              color: COLORS.muted,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {recommended ? "Your picks" : "Top charts"}
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 21, color: COLORS.accent, fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>
          {recommended ? "Kitsu recommends" : "Trending titles"}
        </div>
        <div style={{ display: "flex", marginTop: 3, color: COLORS.text, fontSize: 34, fontWeight: 700 }}>
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 2, color: COLORS.muted, fontSize: 17 }}>
          {subtitle}
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 24, marginTop: 16 }}>
          <PosterStack titles={data.titles} />
          <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column" }}>
            {recommended ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.titles.slice(0, 2).map((item) => (
                  <TitleRow key={`${item.mediaType}:${item.title}`} item={item} />
                ))}
              </div>
            ) : (
              <TrendingColumns titles={data.titles} />
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", color: COLORS.muted, fontSize: 12, letterSpacing: 0.8 }}>
            Movies and series, curated for your next watch
          </div>
          <div style={{ display: "flex", color: COLORS.accent, fontSize: 13, fontWeight: 700 }}>
            Kitsu
          </div>
        </div>
      </div>
    </div>
  );
}
