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
| Operator dashboard | `/dev` | Passphrase-gated operator area |
| Sign in | `/login` | Operator passphrase sign-in |

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
- **Personal library**: watch history, personal stats, opt-in title alerts.
- **Extras**: title quiz, feedback, donations via Telegram Stars.
- **Owner tools**: service stats, provider health checks, sessions, activity
  inspection, moderation, maintenance, and broadcasts (owner ID only).

A full command-by-command reference lives in the in-app feature catalog
(`/dev/catalog`, operator only) and in summarized form on `/bot`.

## Operator dashboard (`/dev`)

Read-only coverage built on the backend monitoring and admin analytics APIs. Every
`/dev` page and its BFF endpoints require a valid operator session signed in
with the `DASHBOARD_PASSPHRASE` gate at `/login`.

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
retroactively. Only a signed-in operator session can create, edit, or delete
dashboard-written posts. Channel announcements link back to their Telegram
message.

## Configuration

All settings are server-side environment variables. Nothing secret is
exposed to the browser or the public status page.

| Variable | Purpose |
|---|---|
| `KITSU_API_URL` | Base URL of the FastAPI backend (no trailing slash) |
| `KITSU_OWNER_API_TOKEN` | Server-only bearer for backend owner and admin APIs |
| `DASHBOARD_PASSPHRASE` | Shared passphrase guarding `/dev` sign-in |
| `DASHBOARD_SESSION_SECRET` | 32 random bytes, hex-encoded, for signed sessions |
| `DASHBOARD_SESSION_TTL_SECONDS` | Session lifetime, optional (default 12h) |

Copy `.env.example` to your hosting provider's environment settings. Set the
passphrase, API token, and a random session secret in the webapp
deployment. The session secret signs the operator session cookie for the
passphrase-gated Dev area. The owner API token stays server-side;
never commit real values.

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
