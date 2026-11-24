import devConfig from "../../../config.dev.json";

/** Same-origin path that `next dev` forwards to devConfig.platformApiUrl (see next.config.ts). */
const DEV_PLATFORM_PROXY = "/__platform";

/**
 * /config.json in `next dev` only (route.dev.ts is never exported). Each environment deploys its
 * own config.json; a build must never carry one, or uploading out/ would overwrite it.
 *
 * The page is pointed at the dev proxy rather than at the platform itself, so a deployed platform
 * that allows only its own hosted-page origin (CORS) can still be used from localhost.
 */
export function GET(req: Request) {
  const { origin } = new URL(req.url);
  return Response.json(
    { ...devConfig, platformApiUrl: `${origin}${DEV_PLATFORM_PROXY}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
