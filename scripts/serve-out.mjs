// Serves out/ the way the CDN must (README "Deploy"): /v/* rewritten to the entry file, the
// fixed security headers, no-store on the entry file and config.json, long cache on hashed
// assets. For local checks and CI only — production is the CDN.
//
//   node scripts/serve-out.mjs [port]      config.json: CONFIG_JSON='{…}', else config.dev.json
//   (the build carries no config.json; on the CDN each environment deploys its own)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const OUT = fileURLToPath(new URL("../out/", import.meta.url));
const DEV_CONFIG = fileURLToPath(new URL("../config.dev.json", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain",
};

/** Fixed headers: they don't change between releases, so they are safe on the CDN (DL-018). */
export const SECURITY_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function startServer(port = 0) {
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://x");
    let file;
    let cache = "public, max-age=3600";
    if (/^\/v\/[^/]+\/?$/.test(pathname)) {
      file = "v/_.html"; // the CDN rewrite
      cache = "no-store";
    } else if (pathname === "/config.json") {
      const body = process.env.CONFIG_JSON ?? (await readFile(DEV_CONFIG, "utf8"));
      res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
      return res.end(body);
    } else {
      file = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
      if (pathname.startsWith("/_next/static/")) cache = "public, max-age=31536000, immutable";
    }
    try {
      const body = await readFile(join(OUT, file));
      res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": cache });
      res.end(body);
    } catch {
      const body = await readFile(join(OUT, "404.html")).catch(() => "Not found");
      res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": TYPES[".html"], "Cache-Control": "no-store" });
      res.end(body);
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer(Number(process.argv[2] ?? 3000));
  console.log(`out/ on http://localhost:${server.address().port}  (/v/<hostedId> → v/_.html)`);
}
