import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEV_PLATFORM_PROXY } from "./src/lib/devProxy";

const isDev = process.env.NODE_ENV !== "production";

/** Where the dev proxy forwards to. Read once at startup: restart `next dev` after changing it. */
function devPlatformTarget(): string {
  const { platformApiUrl } = JSON.parse(readFileSync(path.join(__dirname, "config.dev.json"), "utf8"));
  return String(platformApiUrl).replace(/\/+$/, "");
}

/**
 * Static export served from a CDN (DL-018). Security headers, the /v/* rewrite and caching are
 * CDN rules (see README); the CSP is a <meta> tag added by scripts/csp.mjs after the build.
 */
const nextConfig: NextConfig = {
  // Pin the workspace root (a package-lock.json exists in a parent folder).
  outputFileTracingRoot: path.join(__dirname),
  // Export only at build time: in dev, /v/<any hostedId> must still resolve.
  output: isDev ? undefined : "export",
  // *.dev.ts(x) exist in dev only, never in the export: /preview and the dev /config.json.
  pageExtensions: isDev ? ["dev.tsx", "dev.ts", "tsx", "ts"] : ["tsx", "ts"],
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  // Rewrites do not exist in a static export; the CDN never sees this path.
  ...(isDev && {
    rewrites: async () => [
      { source: `${DEV_PLATFORM_PROXY}/:path*`, destination: `${devPlatformTarget()}/:path*` },
    ],
  }),
};

export default nextConfig;
