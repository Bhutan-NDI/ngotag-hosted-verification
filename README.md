# Ngotag hosted verification

One NDI-owned page for the QR code and the "Open Bhutan NDI" button, reused by every relying party (HVP-SD).
A relying party's backend creates a proof request with a `redirectUri`. The platform returns `hostedPageUrl` (`/v/<hostedId>`). The browser comes here, the user approves in the wallet, and the browser goes back to the relying party with a single-use `response_code`.

Next.js 15 (App Router, static export), TypeScript, Tailwind CSS v4. Light theme only. English and Dzongkha.

References such as DL-007, HVP-SD §5.6 or UXD-10 point to NDI's internal design documents (the decision log, the solution design and the UX specification), which are not public. The behaviour they describe is summarised below.

### Glossary

| Term | Meaning |
|---|---|
| **DL-xxx** | An entry in NDI's decision log for hosted verification, e.g. DL-007 "after the deep link, the page doesn't redirect" |
| **HVP-SD §x** | A section of the hosted verification solution design (the platform and page contract) |
| **UXD-xx** | An item in the UX specification for the page's screens |
| **AC n** | Acceptance criterion n of the hosted verification work |
| **Relying party** | The service (e.g. a government portal) that asks the citizen to verify with Bhutan NDI |
| **`hostedId`** | The opaque, random id in the page URL (`/v/<hostedId>`); the only input the page reads from its URL |
| **Proof request** | The relying party's request for credentials, created on the NDI platform; shown as a QR code or opened through a deep link |
| **Deep link** | The link that opens the Bhutan NDI wallet on the same phone ("Continue") |
| **`response_code`** | The single-use code the citizen brings back to the relying party, which exchanges it with the platform for the result |
| **`returnUrl`** | `redirectUri?response_code=…`: where the citizen goes back to once the proof has an outcome |
| **`redirectUri`** | The relying party's registered return address; without a code the page adds `error=<reason>` |

## How it works

The page is static files on a CDN; it keeps no state and holds no secrets. It reads only the opaque `hostedId` from its URL (DL-003) and talks to two **public, read-only platform endpoints** straight from the browser (HVP-SD §5.3):

| Call | Used for |
|---|---|
| `GET {platformApiUrl}/verification/hosted/:hostedId` | `returnHost`, `redirectUri` (without the code), `proofRequestURL`, `deepLinkURL` (with `returnUrl`), `expiresAt`, `serverTime` |
| `GET {platformApiUrl}/verification/hosted/:hostedId/status` | `pending` · `scanned` · `completed` · `declined` (optional) · `failed` · `expired`, plus `returnUrl` on `completed`, `declined` or `failed` |

Behaviour (decision log wins over the solution design):

- **QR code** encodes only `proofRequestURL`; only the button uses `deepLinkURL` (DL-004).
- **Both paths, always:** QR code first on desktop, "Open Bhutan NDI" first on phones; each offers the other (§5.6). Phone or desktop is detected in the browser; `?mode=web|mobile` overrides it.
- **Polling** (DL-008): every 2 s for the first minute, then every 4 s. It pauses while the tab is hidden and checks at once when it is visible again, backs off on errors, and stops on a final state or at the deadline.
- **Completed:** in QR mode, redirect to `returnUrl` at once (§5.6). This is the only automatic navigation. **After the deep link is tapped**, the wallet opens `returnUrl` itself (E7), so the page never redirects; it shows "All done here" with a manual "Return to &lt;host&gt;" in case the wallet's return did not arrive (DL-007).
- **Scanned** (optional, DL-016): hide the QR code and ask the user to approve in the wallet. If the request expires while scanned, show "You did not approve in time".
- **Expired:** on the deadline (`expiresAt`, shared with the wallet, judged on server time) or on `expired` from the platform (DL-017). A "Start again at &lt;host&gt;" button only; the page never returns on its own (DL-013). No request duration is shown (UXD-10).
- **Unknown link:** "This request is no longer available", with no way back: the page never learned the host (DL-013, §6).
- **Every return is a button** with either a valid `returnUrl` or `redirectUri?error=<reason>`, never the bare `redirectUri` (DL-019):

  | Screen | Without a valid code |
  |---|---|
  | expired, not approved in time | `error=expired` |
  | declined | `error=declined` |
  | failed | `error=failed` |
  | lost mid-flow, done with no code left | `error=unavailable` |
  | "Cancel and return to &lt;host&gt;" (pending screens) | `error=cancelled` |

  Relying parties should treat an unknown `error` like `failed`.
- **Server time** (DL-021): when the platform sends `serverTime`, the page keeps `offset = serverTime − device time` and judges the deadline and polling stop on it. It stops offering `returnUrl` 5 s before `returnUrlExpiresAt` and falls back to the reason link. Without these fields it uses the device clock and no code expiry.
- **Branding:** NDI branding and "You'll return to &lt;host&gt;" only, with no organisation name or logo (DL-009).
- **Security:** cannot be framed (`frame-ancestors 'none'` and `X-Frame-Options` on the CDN, DL-002). The CSP is a `<meta>` tag with build-time script hashes, plus a CDN header that narrows `connect-src` to the platform. `Referrer-Policy: no-referrer`.

Code map:
- [src/components/hosted/HostedEntry.tsx](src/components/hosted/HostedEntry.tsx): static entry; reads the hostedId, device and config.json in the browser
- [src/lib/runtimeConfig.ts](src/lib/runtimeConfig.ts): loads config.json
- [src/lib/platform.ts](src/lib/platform.ts): platform client (validates responses; only http(s) URLs are accepted)
- [src/lib/flow.ts](src/lib/flow.ts): state machine for every screen
- [src/components/hosted/HostedFlow.tsx](src/components/hosted/HostedFlow.tsx): loading, polling, deadline, deep link, redirect
- [src/components/hosted/views.tsx](src/components/hosted/views.tsx): screens
- [src/lib/i18n/messages.ts](src/lib/i18n/messages.ts): English and Dzongkha copy
- [scripts/csp.mjs](scripts/csp.mjs), [scripts/serve-out.mjs](scripts/serve-out.mjs), [scripts/check-csp.mjs](scripts/check-csp.mjs): CSP meta tag, CDN-rules server, CI check

## Local development

```bash
npm install
npm run dev          # http://localhost:3000 (use -- -p 3001 if 3000 is taken)
```

In `next dev`, `/config.json` is served from [config.dev.json](config.dev.json); `npm run serve` uses it too. The build carries no `config.json`: each environment deploys its own. Point `platformApiUrl` at a running platform api-gateway (ngotag-platform with the hosted-session and scanned changes):

```json
{ "platformApiUrl": "http://localhost:5000", "languageToggle": true }
```

On the platform side:
- `HOSTED_PAGE_BASE_URL=http://localhost:3000` on the verification service, so a proof request with a `redirectUri` returns `hostedPageUrl`.
- This page's origin in `ENABLE_CORS_IP_LIST` on the api-gateway (`http://localhost:3000` and `:3001` are already in `.env.demo`).

Then create a proof request with a `redirectUri` through the platform API and open the `hostedPageUrl` it returns. Add `?mode=mobile` or `?mode=web` to force a layout.

**http://localhost:3000/preview** shows every screen with demo data, without a platform. It exists only in `next dev` (`page.dev.tsx`) and is never part of the export.

To try the production build locally: `npm run build && npm run serve` serves `out/` the way the CDN does. Build with `CSP_CONNECT_SRC=http://localhost:5000` to let it call a local http platform.

### What the platform sends today

| Field / status | Platform | Page |
|---|---|---|
| `returnHost`, `redirectUri`, `proofRequestURL`, `deepLinkURL`, `expiresAt` | #144 | used |
| `pending`, `completed`, `failed`, `expired` | #144 | used |
| `scanned` | #145 | used; optional |
| `declined` | not yet (a decline is `failed`) | "You declined the request" screen is ready for it |
| `serverTime`, `returnUrlExpiresAt` | not yet (DL-021) | used when present; device clock otherwise |

## Configuration

**Run time:** `config.json`, deployed next to the build per environment, served with `Cache-Control: no-store`. One build serves every environment.

| Key | Notes |
|---|---|
| `platformApiUrl` | Platform api-gateway base URL (https in production). The platform must allow this page's origin (CORS). |
| `languageToggle` | Show the EN / Dzongkha switch (default `true`); when `false`, every page is in English |

**Build time:**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_VIDEO_GUIDE_URL` | Support contacts, store links, video guide |
| `CSP_CONNECT_SRC` | Extra `connect-src` sources in the CSP meta tag (default `https:`, since one build serves every environment). Narrow it per environment with the CDN header below. |

## Deploy (static export on a CDN, DL-018)

`npm run build` produces `out/`: a static export with no server code. [scripts/csp.mjs](scripts/csp.mjs) then writes a `<meta http-equiv="Content-Security-Policy">` tag into each HTML file, with sha256 hashes of that build's inline scripts. The hashes change with every build. In the HTML, the page and its policy ship together, so a release never has new HTML meeting an old CDN header.

**CDN rules:**

| Path | Rule |
|---|---|
| `/v/*` | Rewrite to `/v/_.html` (the entry file; the browser reads the hostedId from the URL). `Cache-Control: no-store`. |
| `/config.json` | Per environment, managed only by that environment's deploy, never by a release. `Cache-Control: no-store`. |
| `/_next/static/*` | Content-hashed: `Cache-Control: public, max-age=31536000, immutable` |
| everything else | 404 → `/404.html` |

**Response headers on every path** (these don't change between releases, so the header is safe):
- `Content-Security-Policy: frame-ancestors 'none'; connect-src 'self' <platform origin>`. `frame-ancestors` can't be set in a meta tag (DL-002). Both policies apply, so this header narrows the meta tag's `connect-src` to this environment's platform.
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy: same-origin`

[scripts/serve-out.mjs](scripts/serve-out.mjs) implements exactly these rules, as the reference for the CDN configuration.

**Releases:**
- Upload `_next/static/*` first, then switch the entry files (`v/_.html`, `404.html`) atomically. Roll back by switching back.
- `config.json` is never part of a release upload. The build doesn't contain one (the CSP step fails the build if it does), so uploading the whole `out/` folder can't overwrite the environment's config.
- Keep the previous release's `_next/static/*` for at least the longest request lifetime, so an open page never loses its scripts.

**CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)): lint, type check, build, then `npm run check:csp`. That loads the built page in headless Chrome, served with the CDN rules, and fails on any CSP violation or if the page's JavaScript never runs.

**Monitoring** (AC 10): a synthetic check every minute that loads `/v/<test id>` and calls the platform's status endpoint, with alerts. It replaces the old `/api/health`.

**On AWS:** the hosting (S3 and CloudFront, with the CDN rules above, `config.json` and the deploy role) is managed in the private `ndi-iac-tf` repository, and the per-environment deploy values and the release ledger in the private `ndi-tf-manifests` repository, both under `hosted-verification`. Releases follow the pattern of the other NGOTAG services ([docs/release-automation.md](docs/release-automation.md)): they start only with `make deploy-qa`, `make deploy-stage` or `make deploy-prod` from a clean, up-to-date `main`, with `DEPLOYMENT_CONFIG_REPOSITORY=Bhutan-NDI/ndi-tf-manifests`. Prod never rebuilds: it promotes the exact bundle Stage runs, so build-time values must be the same in Stage and Prod, and anything that differs per environment belongs in `config.json`. `make release-check` runs the checks that CI runs on the release automation.

## Assets

- `public/figma/ndi-mark.png`: app mark on the dark tile above the title
- `public/qr-logo.png`: round badge in the centre of the QR code, a 192px export (about 20 KB) of NDI's QR logo. The source artwork is not in the current tree (an earlier commit still contains it).
- `public/figma/*.svg`: generic UI icons (arrows, chevrons, status icons, spinner) exported from NDI's own Figma design for this page. They carry no third-party terms.
- `public/badges/`: official Google Play and App Store badges (don't alter them)
- `src/fonts/noto-serif-tibetan.woff2`: Noto Serif Tibetan (SIL OFL), Tibetan subset, for Dzongkha

## Licence

Copyright 2026 Bhutan NDI. The code is licensed under the [Apache License 2.0](LICENSE); see also [NOTICE](NOTICE). See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute, and [SECURITY.md](SECURITY.md) to report a vulnerability.

The licence does not cover:

- **the Bhutan NDI name, logos and icons**, including `public/figma/ndi-mark.png`, `public/figma/scan-button.png`, `public/qr-logo.png`, `public/ndi-mark-mint.png` and `src/app/favicon.ico`. The current tree has only the files the page needs; earlier commits also contain unused NDI artwork (such as the QR logo source), which is covered by the same exclusion. They identify Bhutan NDI and may not be used to suggest endorsement or to imitate the service.
- **the Noto Serif Tibetan font** (`src/fonts/noto-serif-tibetan.woff2`), under the SIL Open Font License 1.1;
- **the store badges** (`public/badges/`), under Google's and Apple's badge guidelines.

The generic UI icons in `public/figma/*.svg` are part of this project's design and are covered by the licence like the code.

## Before launch

- [ ] Platform endpoints live (HVP-SD §8 step 1), with CORS for this origin and the per-`hostedId` rate limit (DL-008)
- [ ] Dzongkha copy reviewed by a native speaker or the DDC (DL-010)
- [ ] Device test: scanning the QR code never opens the relying party's return page on the phone (DL-004, §7 AC 6)
- [ ] Domain and TLS for `id.bhutanndi.com` (DL-012)
