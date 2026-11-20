import devConfig from "../../../config.dev.json";

/**
 * /config.json in `next dev` only (route.dev.ts is never exported). Each environment deploys its
 * own config.json; a build must never carry one, or uploading out/ would overwrite it.
 */
export function GET() {
  return Response.json(devConfig, { headers: { "Cache-Control": "no-store" } });
}
