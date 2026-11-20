// Post-build: writes the Content-Security-Policy into every exported HTML file as a <meta> tag,
// with sha256 hashes of that file's inline scripts. The hashes change with every build, so the
// policy ships inside the page it protects: no release moment where new HTML meets an old CDN
// header (DL-018). frame-ancestors can't be set in a meta tag: it stays a CDN response header.
//
// CSP_CONNECT_SRC (build env, space-separated): extra connect-src sources. Default "https:",
// because one build serves every environment; narrow it per environment with the CDN header.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../out/", import.meta.url));
const CONNECT = (process.env.CSP_CONNECT_SRC ?? "https:").trim();

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const HEAD = /<head[^>]*>/i;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith(".html")) yield p;
  }
}

export function policy(hashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.map((h) => `'sha256-${h}'`).join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${CONNECT}`.trim(),
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

let files = 0;
for await (const file of htmlFiles(OUT)) {
  let html = await readFile(file, "utf8");
  if (html.includes('http-equiv="Content-Security-Policy"')) throw new Error(`${file} already has a CSP meta tag`);
  const hashes = [...new Set([...html.matchAll(INLINE_SCRIPT)].map((m) => createHash("sha256").update(m[1], "utf8").digest("base64")))];
  if (!HEAD.test(html)) throw new Error(`${file}: no <head>`);
  // First thing in <head>: a meta CSP only governs what comes after it.
  html = html.replace(HEAD, (head) => `${head}<meta http-equiv="Content-Security-Policy" content="${policy(hashes)}"/>`);
  await writeFile(file, html);
  files += 1;
  console.log(`csp: ${file.slice(OUT.length)} (${hashes.length} inline scripts)`);
}
if (!files) throw new Error(`csp: no HTML files in ${OUT} — run next build first`);
