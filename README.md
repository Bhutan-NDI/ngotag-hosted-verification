# Bhutan NDI hosted page

A hosted verification page for Bhutan NDI. A partner service sends the user here; the user proves their identity with the **Bhutan NDI Wallet** (deep link on phones, QR code on desktop); the page then sends them back to the partner.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4 and Redis. Light theme only. English and Dzongkha.

## Local development

```bash
cp .env.example .env.local   # mock NDI, in-memory store, one local partner
npm install
npm run dev
```

- http://localhost:3000: developer launcher (mock mode only; returns 404 in production). Click **Start a test session**.
- http://localhost:3000/preview: every screen, mobile and web, with sample data. It includes the language toggle.
- On the hosted page, the **Dev · mock NDI** panel simulates wallet events (scan, approve, decline, fail, expire, approval timeout, cancel) and switches between the mobile and web layouts (`?mode=mobile` or `?mode=web`).

## Production

### Required configuration

The server **refuses to start** in production if any of these are wrong (see [src/instrumentation.ts](src/instrumentation.ts) and `configErrors()` in [config.ts](src/lib/server/config.ts)):

| Variable | Rule |
|---|---|
| `APP_BASE_URL` | https URL of this service |
| `NDI_MOCK` | `false` (mock mode exposes test endpoints) |
| `NDI_CLIENT_ID`, `NDI_CLIENT_SECRET` | from the NDI developer portal |
| `NDI_WEBHOOK_ID`, `NDI_WEBHOOK_TOKEN` | webhook registered with NDI; token at least 32 characters |
| `REDIS_URL` | Redis 6+ (sessions, live-update pub/sub, rate limits) |
| `PARTNERS` | JSON array; each partner has `apiKey` (at least 32 characters) and https `redirectOrigins` |

`NEXT_PUBLIC_*` values (support email and phone, store links) are inlined at **build** time.

### Deploy with Docker

```bash
docker build -t ndi-hosted-page \
  --build-arg NEXT_PUBLIC_SUPPORT_EMAIL=support@example.bt \
  --build-arg NEXT_PUBLIC_SUPPORT_PHONE=1199 .
docker run -p 3000:3000 --env-file .env.production ndi-hosted-page
```

The image is a standalone Node server that runs as a non-root user, with a health check on `GET /api/health`. Run several replicas behind a load balancer; they share state through Redis. The proxy must:
- terminate TLS
- set `X-Forwarded-For` (used for rate limiting)
- **not buffer** `text/event-stream` responses (`/api/sessions/*/events`)

### What's built in

- **Security**
  - Nonce-based Content-Security-Policy ([src/middleware.ts](src/middleware.ts))
  - HSTS, `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer` (session IDs are in the URL)
  - `no-store` caching on the hosted page and API
- **Partner isolation:** each partner has its own API key, display name and allowed redirect origins. Partners can only read results for their own sessions. API keys and webhook tokens are compared in constant time.
- **Rate limits:** session creation is limited per partner, and proof-request creation per client IP, because each one calls NDI.
- **Consistency:** every session change is an atomic compare-and-set in Redis, so a webhook racing an expiry or two tabs can't overwrite each other.
- **Resilience**
  - NDI calls time out, and the access token refreshes once on a 401
  - Live-update streams send heartbeats and recycle every 5 minutes; the browser reconnects automatically
  - Unknown webhook events are acknowledged so NDI doesn't retry them forever; failed event processing returns 500 so NDI retries
- **Logs:** structured JSON, one line per event. Secrets and revealed attributes are never logged.

## Partner API

```http
POST /api/sessions
Authorization: Bearer <partner apiKey>
Content-Type: application/json

{ "redirectUri": "https://service.gov.bt/ndi/callback", "state": "<random, checked on return>",
  "proofName": "optional", "proofAttributes": [ … optional … ] }
→ 201 { "id": "…", "url": "https://<host>/v/<id>", "expiresAt": 1795… }
```

Send the user to `url`. Append `?lang=dz` to open it in Dzongkha.

The user comes back to `redirectUri?session_id=…&status=…&state=…`. **Check `state`, then confirm the outcome server-to-server:**

```http
GET /api/sessions/<id>/result
Authorization: Bearer <partner apiKey>
→ { "id": "…", "status": "verified", "state": "…", "attributes": { … } }
```

`status` is one of: `verified`, `declined`, `failed`, `expired`, `timed_out` or `cancelled`.

## Screens → code

| Figma frame | `View` in [src/lib/flow.ts](src/lib/flow.ts) |
|---|---|
| Loading | `loading` |
| Ready (Continue on phone, QR on web) | `ready` |
| Opening wallet / Still opening (~4s) | `opening` / `still-opening` |
| Waiting after tap | `waiting` |
| QR shown (phone) | `qr` |
| Scanned | `scanned` |
| Returning | `returning` |
| Done, original tab | `done-elsewhere` |
| Declined / Verification failed | `declined` / `failed` |
| Expired / Not approved in time | `expired` / `timed-out` |
| Not found | `not-found` |
| Connection trouble | `reconnecting` |
| No longer available (mid-request) | `unavailable` |

- **Screens:** [src/components/hosted/views.tsx](src/components/hosted/views.tsx)
- **Shared building blocks** (logos, store badges, language toggle): [ui.tsx](src/components/hosted/ui.tsx)
- **Copy (EN and Dzongkha):** [src/lib/i18n/messages.ts](src/lib/i18n/messages.ts)
- **Design tokens:** [globals.css](src/app/globals.css)

## Assets

- `public/ndi-mark-mint.png`: wallet mark (shown on a dark tile)
- `public/center-icon.png`: app icon above the title (88×88)
- `public/QRlogo.svg`: round badge for the centre of the QR code (source, 875 KB). The page uses `public/qr-logo.png`, a 192px export of it (about 20 KB). Re-export the PNG if the SVG changes.
- `public/ndi-studio-on-light.svg`: "Bhutan NDI Studio" lockup (not currently used)
- `public/badges/`: official Google Play and App Store badges. Follow Google's and Apple's badge guidelines and don't alter them.
- `src/fonts/noto-serif-tibetan.woff2`: Noto Serif Tibetan (SIL Open Font License), Tibetan subset only. It's scaled up so Dzongkha matches the size of Latin text.

## Before launch

- [ ] **Dzongkha copy reviewed by a native speaker** (or the Dzongkha Development Commission). It's in [messages.ts](src/lib/i18n/messages.ts).
- [ ] NDI request and response fields and webhook event names in [ndi.ts](src/lib/server/ndi.ts) confirmed against the current NDI docs.
- [ ] Real store listing URLs (`NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_APP_STORE_URL`) and support contacts.
- [ ] Tested against real Redis and a real NDI staging wallet.
