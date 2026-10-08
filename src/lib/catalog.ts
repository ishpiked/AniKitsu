// Single source for the bot feature catalog (spec §4/§6.5 + Kitsu
// features doc). Keep prose here, not duplicated across components.
// Entries describe what a feature does, where it lives, who can use it,
// and its limits — never imply a web button can run a Telegram-only
// command without a backend endpoint. Availability always depends on the
// title and its upstream providers.

export type CatalogGroup =
  | "discover"
  | "player"
  | "library"
  | "party"
  | "extras"
  | "operator";

export const CATALOG_GROUPS: { id: CatalogGroup; label: string }[] = [
  { id: "discover", label: "Discover & play" },
  { id: "player", label: "Player controls & subtitles" },
  { id: "library", label: "Library & recommendations" },
  { id: "party", label: "Watch Together" },
  { id: "extras", label: "Alerts, quiz & support" },
  { id: "operator", label: "Owner & operator tools" },
];

export interface CatalogEntry {
  id: string;
  command: string | null;
  title: string;
  group: CatalogGroup;
  where: string;
  who: string;
  requires: string | null;
  limits: string | null;
}

export const CATALOG: CatalogEntry[] = [
  // --- Discover & play ---
  { id: "stream", command: "/stream", title: "Title search & playback setup", group: "discover", where: "Telegram", who: "Any user", requires: "A title query; selected metadata identifiers feed resolution", limits: "Ranked matches depend on upstream catalog metadata." },
  { id: "search", command: "/search", title: "Title search", group: "discover", where: "Telegram", who: "Any user", requires: "A title query", limits: "Same catalog matching as /stream; results depend on upstream metadata." },
  { id: "trending", command: "/trending", title: "Trending titles", group: "discover", where: "Telegram", who: "Any user", requires: null, limits: "Trending reflects catalog data, not guaranteed playable titles." },
  { id: "recommend", command: "/recommend", title: "Personalized recommendations", group: "discover", where: "Telegram", who: "Users with watch history", requires: "Recorded watch history", limits: "Cold-start users get generic picks." },
  { id: "continue", command: "/continue", title: "Continue watching", group: "discover", where: "Telegram", who: "Users with resume points", requires: "A saved resume point from Mini App heartbeats", limits: null },
  { id: "player-controls", command: null, title: "Active-player controls", group: "discover", where: "Telegram", who: "Viewers with an active player", requires: "A loaded source in your viewer", limits: "Quality, subtitle, audio, and volume controls change your viewer only, never other participants or the shared timeline." },
  // --- Backend, player & playback ---
  { id: "episodes", command: null, title: "Released-episode gating", group: "player", where: "Player", who: "Viewers with resolved metadata", requires: "Title metadata with season/episode air dates", limits: "Only episodes with a passed release date are listed or resolved." },
  { id: "providers", command: null, title: "Provider resolution & fallback", group: "player", where: "Player", who: "Viewers", requires: "At least one discovered server (Nebula, Lisbon, Tardie, Mista, or the rest)", limits: "Automatic fallback races a bounded set; an explicitly selected server stays preferred but may still fail." },
  { id: "validation", command: null, title: "Source validation", group: "player", where: "Backend resolver", who: "Viewers (automatic)", requires: "A candidate HLS playlist or direct-media bytes", limits: "Inconclusive health probes never discard sources a viewer may still reach." },
  { id: "proxy", command: null, title: "HLS rewrite & media proxy", group: "player", where: "Player", who: "Viewers", requires: "A resolved source", limits: "Playlists, segments, init data, keys, subtitles, and supported direct media are proxied past CORS/hotlink restrictions." },
  { id: "quality", command: null, title: "Quality & audio preferences", group: "player", where: "Player", who: "Viewers", requires: "A resolved source exposing those tracks", limits: "Controls appear only when the upstream source supports them." },
  { id: "caching", command: null, title: "Short-TTL backend caches", group: "player", where: "Backend", who: "All viewers (automatic)", requires: null, limits: "Provider listings, searches, resolver results, and rewritten playlists expire in configured short durations." },
  { id: "controls", command: null, title: "Playback controls", group: "player", where: "Web player", who: "Viewers", requires: "A loaded source", limits: "Seeking, fullscreen, and subtitle selection depend on the media and browser." },
  { id: "recovery", command: null, title: "Failure recovery & source fallback", group: "player", where: "Web player", who: "Viewers", requires: "An alternate source for the title", limits: "Recovery retries with another source where one is available." },
  { id: "checkpoints", command: null, title: "Playback checkpoints", group: "player", where: "Web player", who: "Viewers", requires: null, limits: "Local resume state; Mini App heartbeats additionally persist server-side resume." },
  { id: "miniapp", command: null, title: "Telegram Mini App & share links", group: "player", where: "Telegram + web player", who: "Viewers with a share link or Mini App launch", requires: "A server-side share or valid Mini App launch data", limits: "Shares use signed, short-lived capabilities with server-side authorization." },
  { id: "subtitles", command: null, title: "Subtitles & timing offset", group: "player", where: "Player", who: "Viewers", requires: "Subtitles on the resolved source", limits: "Telegram timing changes update connected viewers immediately." },
  { id: "share", command: "/share", title: "Share player links", group: "player", where: "Telegram + player", who: "Viewers", requires: "A resolved share created server-side", limits: "Scope can be private, group, inline-host, or public depending on creation." },
  // --- Library ---
  { id: "track", command: "/track", title: "Watch history & resume points", group: "library", where: "Telegram", who: "Any user", requires: "Recorded playback activity", limits: "Resume state is stored per user, title, season, and episode." },
  { id: "mystats", command: "/mystats", title: "Personal watch stats", group: "library", where: "Telegram", who: "Any user", requires: "Heartbeat-measured watch time", limits: "Measured playback activity, not proof every credited second was watched." },
  { id: "alerts", command: "/alerts", title: "Daily title alerts", group: "library", where: "Telegram", who: "Opted-in users", requires: "Explicit opt-in; missing preference means disabled", limits: "Announces catalog changes such as top picks and premieres." },
  { id: "settings", command: "/settings", title: "Playback preferences", group: "library", where: "Telegram", who: "Any user", requires: null, limits: "Default server, quality, and subtitle preferences apply where supported." },
  // --- Watch Together ---
  { id: "party", command: "/party · /join · /leave · /end", title: "Room lifecycle", group: "party", where: "Telegram + player", who: "Room participants", requires: "A room started from supported search flows", limits: "Idle rooms expire; reconnects get a grace window." },
  { id: "inline-rooms", command: null, title: "Inline personal rooms", group: "party", where: "Telegram inline + player", who: "The inline host", requires: "An inline search result", limits: "One owner-scoped room per user, even when launched from a group; hosts get a private settings panel and DM join/leave notices." },
  { id: "members", command: "/party", title: "Presence & membership", group: "party", where: "Telegram + player", who: "Room participants", requires: "An active room", limits: "Room status includes membership. A membership-verification failure is retryable and distinct from confirmed non-membership." },
  { id: "controls-party", command: "/pause · /play · /seek", title: "Synchronized playback", group: "party", where: "Player (WebSocket)", who: "Participants within host permissions", requires: "An active room with a loaded source", limits: "No second room clock: sync state comes from the room WebSocket." },
  { id: "roles", command: "/cohost · /transfer · /kick · /lock · /unlock", title: "Host & member management", group: "party", where: "Telegram + player", who: "Host, co-host, or group admin as appropriate", requires: "Sufficient role in the room", limits: "Locked rooms refuse new joins." },
  { id: "queue", command: "/skip · /autoplay · /schedule", title: "Queue, autoplay & scheduling", group: "party", where: "Telegram + player", who: "Participants within host permissions", requires: null, limits: "Scheduled sessions depend on the party scheduler." },
  { id: "roomchat", command: null, title: "Room chat & state display", group: "party", where: "Player", who: "Room participants", requires: "An active room", limits: "The player shows room state, participants, and chat; join/leave notices may also appear in the originating group." },
  // --- Extras ---
  { id: "quiz", command: "/quiz", title: "Title quiz", group: "extras", where: "Telegram", who: "Any user", requires: null, limits: null },
  { id: "feedback", command: "/feedback", title: "Send feedback", group: "extras", where: "Telegram", who: "Any user", requires: null, limits: "Routed to Kitsu support." },
  { id: "donate", command: "/donate", title: "Donate with Telegram Stars", group: "extras", where: "Telegram", who: "Any user", requires: null, limits: null },
  { id: "ping", command: "/ping", title: "Telegram API latency check", group: "extras", where: "Telegram", who: "Any user", requires: null, limits: "Measures bot-to-Telegram round trip only." },
  { id: "help", command: "/help · /start", title: "Welcome & help", group: "extras", where: "Telegram", who: "Any user", requires: null, limits: null },
  // --- Operator (Telegram owner commands; NOT web actions) ---
  { id: "admin", command: "/admin", title: "Owner dashboard", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "Telegram-side control, not a web API." },
  { id: "op-status", command: "/stats · /metrics · /healthcheck · /servers · /sessions", title: "Service & provider inspection", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "Read-only inspection; the web dashboard mirrors these." },
  { id: "op-rooms", command: "/partyctl", title: "Inspect active rooms", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "No web room-summary API exists yet." },
  { id: "op-logs", command: "/logs · /cache · /activity", title: "Logs, caches & activity", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "Cache clearing is a live mutation. Confirm intent first." },
  { id: "op-users", command: "/recent · /top · /find · /info · /chat", title: "User & group inspection", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "Minimize identifiers; no bulk export." },
  { id: "op-moderation", command: "/ban · /unban · /abuse · /provider · /blocktitle", title: "Moderation & provider toggles", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "Mutations need confirmation and should be audited." },
  { id: "op-comms", command: "/broadcast · /testmsg · /forward · /msg · /announce", title: "Owner communications", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "Preview before sending; mass sends need explicit policy." },
  { id: "op-ops", command: "/gmsg · /gexit · /maintenance · /restart", title: "Group & process operations", group: "operator", where: "Telegram · owner ID only", who: "Owner", requires: "OWNER_USER_ID match", limits: "Restart and maintenance affect all users, so confirm first." },
];
