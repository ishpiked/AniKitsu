# Kitsu Web

Operator and status surfaces for Kitsu while its media path moves to Bedrot.
The old streaming stack is gone. Search, metadata, accounts, the blog, and
service monitoring remain.

## What lives here

- `/`: public service overview with live API and Telegram bot health.
- `/status`: public status page with latency, uptime, coverage, and transitions.
- `/blog`: public reading, with writing available to the owner.
- `/bot`: migration notice for the paused Telegram bot.
- `/profile`: personal Telegram account and historical watch activity.
- `/profile/dashboard`: private owner dashboard.
- `/login`: Telegram account sign in.

## Current state

The backend keeps catalog search, title and anime metadata, Telegram account
verification, accounts, blog storage, monitoring, and the owner and admin APIs.
Provider discovery, source resolution, the media proxy, share links, the
player, watch heartbeats, rooms, party state, and room chat were removed.

The Telegram bot is a polling shell with no command, message, callback, or
inline handlers. It stays online so the status page can probe the Telegram
connection. A new interaction design will replace the removed commands.

The separate player deployment is also gone. The player web app is now a
branded holding page that points to Bedrot while integration continues.

## Profile and owner dashboard

Users see their Telegram identity, membership dates, and watch history that
was recorded before playback was removed. When opened inside Telegram, the page
signs them in with signed Web App data. Browser visitors can use the Telegram
Login Widget. The backend verifies both methods with the bot token, and Kitsu
stores the verified identity in a signed, HTTP only session cookie.

The owner dashboard covers the overview, service health, audience, users,
referrals, and blog. Provider inventory, room control, and the feature catalog
are gone. Owner pages and data are checked on the server.

Dashboard and blog requests go through Kitsu server routes to the configured
FastAPI backend. The browser talks to same-origin Kitsu routes, and owner
credentials stay on the server. The backend address must be stable. Temporary
tunnel addresses can expire and cause DNS errors.

## Deployment and data flow

This repository deploys one Next.js app: the dashboard and public site at
`https://kitsubot.vercel.app/`. It uses `KITSU_API_URL` in its server routes to
fetch status, owner, admin, and blog data from the FastAPI backend.

Set `NEXT_PUBLIC_SITE_URL=https://kitsubot.vercel.app` for canonical links,
Open Graph images, the sitemap, and structured data. Keep
`KITSU_OWNER_API_TOKEN` matched to the backend's `OWNER_API_TOKEN`. Do not point
this app at another Vercel deployment as its API.

The former WeCollege relay at `/api/stream-relay` was removed.

## Blog

The blog combines channel posts that were mirrored before the bot became
handler-free with posts written in the owner dashboard. New channel posts are
not mirrored while the bot registers no handlers. Older posts stay readable.

Dashboard posts support a title, body, and an optional JPEG, PNG, GIF, or WebP
image up to 5 MiB. Only the verified bot owner can create, edit, or delete
them. Blog pages load from the backend during server rendering. Mirrored
channel announcements keep a link to their Telegram message.

## Configuration

All settings are server side environment variables. Nothing secret is exposed
to the browser or the public status page.

- `KITSU_API_URL`: stable base URL of the FastAPI backend.
- `KITSU_OWNER_API_TOKEN`: bearer for backend owner and admin APIs.
- `KITSU_TELEGRAM_BOT_USERNAME`: Telegram bot username linked to the site domain.
- `NEXT_PUBLIC_SITE_URL`: public canonical origin of the deployment.
- `DASHBOARD_SESSION_SECRET`: 32 random bytes, hex encoded, for signed sessions.
- `DASHBOARD_SESSION_TTL_SECONDS`: session lifetime, optional, default 12 hours.

Copy `.env.example` to the hosting provider's environment settings. Set the
stable backend address, bot username, owner API token, and a random session
secret. Link the site domain to the bot in BotFather. The owner API token stays
on the server and must never be committed.

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

Next.js App Router, Tailwind CSS v4, shadcn/ui with Radix, Motion, Recharts,
Solar icons, and BFF proxy routes with an allowlisted backend surface and short
response caching.

## Notes

- Metadata and any future media rely on third-party availability. The UI
  reports unavailable, stale, and unverified states instead of implying
  guarantees.
- Watch time shown anywhere is historical playback activity recorded before
  playback was removed. It is not proof of watching.
- Solar icons by 480 Design, CC BY 4.0.
