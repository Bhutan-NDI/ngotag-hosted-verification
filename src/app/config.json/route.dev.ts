import { DEV_PLATFORM_PROXY } from "@/lib/devProxy";
import devConfig from "../../../config.dev.json";

/**
 * /config.json in `next dev` only (route.dev.ts is never exported). Each environment deploys its
 * own config.json; a build must never carry one, or uploading out/ would overwrite it.
 *
 * Points the page at the dev proxy on the origin the browser actually used. `req.url` is always
 * http://localhost:<port> in `next dev`, so the origin comes from the request headers: a phone on
 * the LAN, 127.0.0.1 and an https tunnel each get their own origin back.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const first = (name: string) => req.headers.get(name)?.split(",")[0].trim() || undefined;
  const host = first("x-forwarded-host") ?? first("host") ?? url.host;
  const proto = first("x-forwarded-proto") ?? url.protocol.replace(/:$/, "");
  return Response.json(
    { ...devConfig, platformApiUrl: `${proto}://${host}${DEV_PLATFORM_PROXY}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
