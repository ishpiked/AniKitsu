# Kitsu Web

Web surfaces for **Kitsu**, a Telegram-native title discovery and streaming
product: search once, race every provider for the best playable source, then
watch in the browser or inside Telegram, solo or in a synced room.

## What lives here

| Surface | Route | Access |
|---|---|---|
| Landing | `/` | Public |
| Service status | `/status` | Public, unauthenticated sanitized snapshot |
| Blog | `/blog` | Public reading; owner-only writing |
| Bot guide | `/bot` | Public command reference |
| Profile | `/profile` | Telegram verified personal account |
| Owner dashboard | `/profile/dashboard` | Bot owner account only |
| Sign in | `/login` | Telegram account sign-in |

## The Telegram bot

The bot is the remote control. The player handles watching; the bot handles
everything around it.

- **Discovery**: title search, trending picks, recommendations from watch
  history, next-episode suggestions, and resume points.
- **Playback setup**: season and episode pickers, provider selection with
  bounded automatic fallback, quality and subtitle preferences.
- **Watch Together**: synced pause, play, and seek with host and co-host
  tools, locks, autoplay, scheduling, room chat, and inline personal rooms.
- **Inline mode**: search from any chat and insert result cards with Watch
  and Share actions.
- **Personal library**: watch history, personal stats, opt-in title alerts, and automatic monthly and yearly wrap cards.
- **Extras**: feedback and donations via Telegram Stars.
- **Owner tools**: service stats, provider health checks, sessions, activity
  inspection, moderation, maintenance, and broadcasts (owner ID only).

A full command-by-command reference lives in the owner feature catalog
(`/profile/dashboard/catalog`) and in summarized form on `/bot`.

## Profile and owner dashboard

Users see their account details, watch activity, and recent titles at
`/profile`. When opened inside Telegram, the page signs them in automatically
with Telegram's signed Web App data. Browser visitors can use the Telegram Login
Widget. The backend verifies both methods with the existing bot token, and
Kitsu stores the verified identity in a signed HTTP only session cookie. The
bot owner sees an additional service dashboard at `/profile/dashboard`. Owner
pages and data are checked on the server.

Dashboard and blog data requests go through Kitsu server routes to the
configured FastAPI backend. The browser talks to the same-origin Kitsu routes;
owner credentials remain server-side. The backend address must be stable.
Temporary tunnel addresses can expire and cause DNS errors.

## Deployment links and data flow

The player and dashboard are separate Vercel deployments with separate
Telegram Mini App links:

- Player: `https://anikitsu.vercel.app/` and `https://t.me/AniKitsuBot/play`.
  The `Frontend` deployment calls the FastAPI backend from the browser using
  `NEXT_PUBLIC_BACKEND_URL`.
- Dashboard: `https://kitsubot.vercel.app/` and
  `https://t.me/AniKitsuBot/status`. This `Kitsu` deployment uses
  `KITSU_API_URL` in its server routes to fetch dashboard and blog data from
  the same FastAPI backend. Owner credentials stay on the server.

Set `NEXT_PUBLIC_SITE_URL=https://kitsubot.vercel.app` on the dashboard
deployment. Set `NEXT_PUBLIC_BACKEND_URL` on the player and `KITSU_API_URL` on
the dashboard to the same stable backend API origin. Do not point either
deployment at the other Vercel app as its API.

The dashboard also hosts the authenticated WeCollege relay at
`/api/stream-relay`. Its function runs in Mumbai, and the backend uses the
existing `OWNER_API_TOKEN` for authentication. Keep that value matched to
`KITSU_OWNER_API_TOKEN` in the dashboard deployment.

- **Overview**: overall Operational / Degraded / Down / Unknown verdict with
  reasons, plus API, bot, provider, traffic, audience, and history cards.
- **Service Health**: availability timelines, uptime with observed and
  coverage counts, latency mean and p95, error bars, bot probe latency.
- **Providers**: per-server health with stale flags, latency series with
  stale samples marked, and a state-change log.
- **Audience**: DAU/WAU/MAU buckets, joins and leaves, heartbeat watch-time splits, and alert audience from the protected admin analytics, plus eligibility totals kept distinct from activity counts.
- **Watch Together**: live room summaries from the read-only admin rooms endpoint (process-local scope), with locked, presence, and playback state.
- **Feature Catalog**: searchable catalog of every bot capability.

Charts show UTC timestamps, keep gaps for missing samples, and never render
failures as zeros. Ranges from 1 hour to 90 days; history payloads are
decimated server-side for transfer speed.

## Blog (`/blog`)

The blog combines posts from the configured Telegram updates channel with
notes written in the dashboard by the bot owner. The backend bot must be an
administrator in that channel, `UPDATES_CHANNEL_ID` must identify it, and
MongoDB must be configured. New channel posts and edits are mirrored while the
bot is receiving Telegram updates; older channel posts are not imported
retroactively. Format channel announcements with the title on the first line
and the post body on the following lines. For example:

```text
New player update

Playback controls are now easier to use on mobile.
```

The bot uses the first line as the title (up to 160 characters), the remaining
lines as the body, and can mirror an attached JPEG, PNG, GIF, or WebP photo up
to 5 MiB. Only the verified bot owner can create, edit, or delete
dashboard-written posts. Blog pages load from the backend during server
rendering. Channel announcements link back to their Telegram message.

## Configuration

All settings are server-side environment variables. Nothing secret is
exposed to the browser or the public status page.

| Variable | Purpose |
|---|---|
| `KITSU_API_URL` | Stable base URL of the FastAPI backend |
| `KITSU_OWNER_API_TOKEN` | Server-only bearer for backend owner and admin APIs |
| `KITSU_TELEGRAM_BOT_USERNAME` | Telegram bot username linked to the site domain |
| `NEXT_PUBLIC_SITE_URL` | Public canonical origin of the dashboard deployment |
| `DASHBOARD_SESSION_SECRET` | 32 random bytes, hex-encoded, for signed profile sessions |
| `DASHBOARD_SESSION_TTL_SECONDS` | Session lifetime, optional (default 12h) |

Copy `.env.example` to your hosting provider's environment settings. Set the
stable backend address, bot username, owner API token, and a random session
secret in the webapp deployment. Link the site domain to the bot in BotFather.
The owner API token stays server side and must never be committed.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Stack

Next.js (App Router) · Tailwind CSS v4 · shadcn/ui + Radix · Motion ·
Recharts · Solar icons · BFF proxy routes with an allowlisted backend
surface and short response caching.

## Notes

- Stream sources and metadata rely on upstream availability. The UI reports
  unavailable, stale, and unverified states instead of implying guarantees.
- Watch time shown anywhere is heartbeat-measured playback activity, not
  proof of watching.
- Solar icons by 480 Design, CC BY 4.0.
