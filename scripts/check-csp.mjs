// CI gate: loads the built page (out/) in headless Chrome, served as the CDN serves it, and fails
// on any CSP violation or if the page's JavaScript never runs (DL-018).
//
//   npm run build && npm run check:csp        CHROME_PATH overrides the browser location
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "./serve-out.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROMES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);
const chromePath = CHROMES.find((p) => existsSync(p));
if (!chromePath) throw new Error("check-csp: no Chrome found; set CHROME_PATH");

// An https platform that doesn't resolve: allowed by connect-src, fails on the network, so the
// page shows "Reconnecting…" — proof its scripts ran.
process.env.CONFIG_JSON = JSON.stringify({ platformApiUrl: "https://platform.invalid", languageToggle: true });
const server = await startServer(0);
const base = `http://localhost:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), "check-csp-"));
const debugPort = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

let failed = false;
try {
  let target;
  // Up to 30 s: a cold Chrome on a busy CI runner sometimes needs more than 10 s to open its debug port.
  for (let i = 0; i < 300 && !target; i++) {
    await sleep(100);
    try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
  }
  if (!target) throw new Error("check-csp: Chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === "Log.entryAdded" && /Content Security Policy|Refused to/i.test(m.params.entry.text)) consoleErrors.push(m.params.entry.text);
  };
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true }))?.result?.value;

  await send("Log.enable");
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: "window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+(e.blockedURI||'inline')));",
  });

  const pages = [
    // An invalid id: the static HTML shows "Just a moment"; only running JS switches to not-found.
    { path: "/v/not-a-hosted-id?mode=web", expect: "no longer available" },
    // A well-formed id: JS loads config.json, then fails to reach the platform.
    { path: `/v/${"A".repeat(43)}?mode=mobile`, expect: "Reconnecting" },
  ];
  for (const { path, expect } of pages) {
    await send("Page.navigate", { url: base + path });
    let ran = false;
    for (let i = 0; i < 150 && !ran; i++) {
      await sleep(100);
      ran = Boolean(await evaluate(`document.body && document.body.innerText.includes(${JSON.stringify(expect)})`));
    }
    const violations = (await evaluate("window.__csp")) ?? [];
    const meta = await evaluate(`!!document.querySelector('meta[http-equiv="Content-Security-Policy"]')`);
    const ok = ran && meta && violations.length === 0;
    console.log(`${ok ? "PASS" : "FAIL"}  ${path}  js-ran=${ran} meta-csp=${meta} violations=${violations.length}`);
    for (const v of violations) console.log(`      violation: ${v}`);
    if (!ok) failed = true;
  }
  for (const text of consoleErrors) console.log(`      console: ${text}`);
  if (consoleErrors.length) failed = true;
  ws.close();
} finally {
  chrome.kill();
  server.close();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
if (failed) {
  console.error("check-csp: FAILED");
  process.exit(1);
}
console.log("check-csp: OK");
