# Kitsu Web

Web surfaces for **Kitsu**, a Telegram-native title discovery and streaming
product: search once, race every provider for the best playable source, then
watch in the browser or inside Telegram, solo or in a synced room.

## What lives here

| Surface | Route | Access |
|---|---|---|
| Landing | `/` | Public |
| Service status | `/status` | Public, unauthenticated sanitized snapshot |
| Bot guide | `/bot` | Public command reference |
| Operator dashboard | `/dev` | Passphrase gate (interim auth) |
| Sign in | `/login` | Operator passphrase |

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

Read-only Phase 1 coverage built on the backend monitoring API:

- **Overview**: overall Operational / Degraded / Down / Unknown verdict with
  reasons, plus API, bot, provider, traffic, audience, and history cards.
- **Service Health**: availability timelines, uptime with observed and
  coverage counts, latency mean and p95, error bars, bot probe latency.
- **Providers**: per-server health with stale flags, latency series with
  stale samples marked, and a state-change log.
- **Audience**: current user and group totals with definitions and limits.
- **Watch Together**: placeholder until a safe room-summary endpoint exists.
- **Feature Catalog**: searchable catalog of every bot capability.

Charts show UTC timestamps, keep gaps for missing samples, and never render
failures as zeros. Ranges from 1 hour to 90 days; history payloads are
decimated server-side for transfer speed.

## Configuration

All settings are server-side environment variables. Nothing secret is
exposed to the browser or the public status page.

| Variable | Purpose |
|---|---|
| `KITSU_API_URL` | Base URL of the FastAPI backend (no trailing slash) |
| `DASHBOARD_PASSPHRASE` | Operator passphrase for the `/dev` gate |
| `DASHBOARD_SESSION_SECRET` | HMAC secret signing operator session cookies |
| `DASHBOARD_SESSION_TTL_SECONDS` | Session lifetime, optional (default 12h) |

Copy `.env.example` to your hosting provider's environment settings. Never
commit real values. The passphrase gate is interim protection until a real
identity provider and backend admin API exist.

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
