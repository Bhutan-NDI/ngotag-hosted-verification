import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV !== "production";

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
};

export default nextConfig;
