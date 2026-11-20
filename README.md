# Bhutan NDI hosted verification page

One NDI-owned page for the QR code and the "Open Bhutan NDI" button, reused by every relying party (HVP-SD).
A relying party's backend creates a proof request with a `redirectUri`. The platform returns `hostedPageUrl` (`/v/<hostedId>`). The browser comes here, the user approves in the wallet, and the browser goes back to the relying party with a single-use `response_code`.

Next.js 15 (App Router), TypeScript, Tailwind CSS v4. Light theme only. English and Dzongkha.

## How it works

The page keeps no state and holds no secrets. It reads only the opaque `hostedId` from its URL (DL-003) and talks to two **public, read-only platform endpoints** straight from the browser (HVP-SD §5.3):

| Call | Used for |
|---|---|
| `GET {PLATFORM_API_URL}/verification/hosted/:hostedId` | `returnHost`, `redirectUri` (without the code), `proofRequestURL`, `deepLinkURL`, `expiresAt` |
| `GET {PLATFORM_API_URL}/verification/hosted/:hostedId/status` | `pending` · `scanned` · `completed` · `declined` (optional) · `failed` · `expired`, plus `returnUrl` on `completed`, `declined` or `failed` |

Behaviour (decision log wins over the solution design):

- **QR code** encodes only `proofRequestURL`; only the button uses `deepLinkURL` (DL-004).
- **Both paths, always:** QR code first on desktop, "Open Bhutan NDI" first on phones; each offers the other (§5.6). Phone or desktop is chosen from the user agent; `?mode=web|mobile` overrides it.
- **Polling** (DL-008): every 2 s for the first minute, then every 4 s. It pauses while the tab is hidden and checks at once when it is visible again, backs off on errors, and stops on a final state or at the deadline.
- **Completed:** redirect to `returnUrl` at once (§5.6). **After the deep link is tapped**, never redirect on our own; offer "Return to &lt;host&gt;" instead (DL-007).
- **Scanned** (optional, DL-016): hide the QR code and ask the user to approve in the wallet. If the request expires while scanned, show "You did not approve in time".
- **Expired:** on the deadline (`expiresAt`, shared with the wallet) or on `expired` from the platform (DL-017). Show "Start again at &lt;host&gt;", which links to `redirectUri?error=expired`; never automatic (DL-013).
- **Unknown or gone link:** a generic "This request has expired", with no link (DL-013, §6).
- **Failed** (declined or not completed): show the outcome, with a link back to `returnUrl`.
- **Branding:** NDI branding and "You'll return to &lt;host&gt;" only, with no organisation name or logo (DL-009).
- **Security:** cannot be framed (`frame-ancestors 'none'`, DL-002). Nonce-based CSP whose `connect-src` allows only this origin and the platform origin. `Referrer-Policy: no-referrer`.

Code map:
- [src/lib/platform.ts](src/lib/platform.ts): platform client (validates responses; only http(s) URLs are accepted)
- [src/lib/flow.ts](src/lib/flow.ts): state machine for every screen
- [src/components/hosted/HostedFlow.tsx](src/components/hosted/HostedFlow.tsx): loading, polling, deadline, deep link, redirect
- [src/components/hosted/views.tsx](src/components/hosted/views.tsx): screens
- [src/lib/i18n/messages.ts](src/lib/i18n/messages.ts): English and Dzongkha copy

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Point the page at a running platform api-gateway (ngotag-platform with PRs #144 hosted session and #145 scanned):

```bash
# .env.local
PLATFORM_API_URL=http://localhost:5000
```

On the platform side:
- `HOSTED_PAGE_BASE_URL=http://localhost:3000` on the verification service, so a proof request with a `redirectUri` returns `hostedPageUrl`.
- This page's origin in `ENABLE_CORS_IP_LIST` on the api-gateway (`http://localhost:3000` is already in `.env.demo`).

Then create a proof request with a `redirectUri` through the platform API and open the `hostedPageUrl` it returns. Add `?mode=mobile` or `?mode=web` to force a layout.

**http://localhost:3000/preview** shows every screen with demo data, without a platform (`ENABLE_PREVIEW`, on by default outside production).

### What the platform sends today

| Field / status | Platform | Page |
|---|---|---|
| `returnHost`, `redirectUri`, `proofRequestURL`, `deepLinkURL`, `expiresAt` | #144 | used |
| `pending`, `completed`, `failed`, `expired` | #144 | used |
| `scanned` | #145 | used; optional |
| `declined` | not yet (a decline is `failed`) | "You declined the request" screen is ready for it |
| `expiresInSeconds` | not yet | the expired screen says "a limited time" instead of "10 minutes" |

## Configuration

Read at run time unless marked *build*, so one image serves every environment.

| Variable | Notes |
|---|---|
| `APP_BASE_URL` | This page's public URL; https in production (`https://id.bhutanndi.com`, DL-012) |
| `PLATFORM_API_URL` | Platform api-gateway base URL. Required (https in production). The platform must allow this page's origin (CORS). |
| `ENABLE_PREVIEW` | Design gallery at `/preview` (default: on outside production) |
| `ENABLE_LANGUAGE_TOGGLE` | Show the EN / Dzongkha switch (default `true`); when `false`, every page is in English |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_VIDEO_GUIDE_URL` | *build*: support contacts, store links, video guide |

The server checks its configuration at start-up and refuses to start in production if it is invalid.

## Deploy

```bash
docker build -t ndi-hosted-page --build-arg NEXT_PUBLIC_SUPPORT_EMAIL=… .
docker run -p 3000:3000 -e APP_BASE_URL=https://id.bhutanndi.com -e PLATFORM_API_URL=https://… ndi-hosted-page
```

The Docker image is a standalone Node server that runs as a non-root user. Its health check is `GET /api/health`.

## Assets

- `public/center-icon.png`: app icon above the title
- `public/QRlogo.svg`: round badge for the centre of the QR code (875 KB source). The page uses `public/qr-logo.png`, a 192px export (about 20 KB); re-export it if the SVG changes.
- `public/badges/`: official Google Play and App Store badges (don't alter them)
- `src/fonts/noto-serif-tibetan.woff2`: Noto Serif Tibetan (SIL OFL), Tibetan subset, for Dzongkha

## Before launch

- [ ] Platform endpoints live (HVP-SD §8 step 1), with CORS for this origin and the per-`hostedId` rate limit (DL-008)
- [ ] Dzongkha copy reviewed by a native speaker or the DDC (DL-010)
- [ ] Device test: scanning the QR code never opens the relying party's return page on the phone (DL-004, §7 AC 6)
- [ ] Domain and TLS for `id.bhutanndi.com` (DL-012)
