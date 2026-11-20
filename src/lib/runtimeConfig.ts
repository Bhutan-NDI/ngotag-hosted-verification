/**
 * Per-environment settings, read at run time from /config.json deployed next to the build, so
 * one build serves every environment (DL-018). Served with Cache-Control: no-store.
 */
export interface RuntimeConfig {
  /** Platform api-gateway base URL serving /verification/hosted/:hostedId and /status. */
  platformApiUrl: string;
  /** Show the EN / Dzongkha switch. When false, every page is in English. */
  languageToggle: boolean;
}

let pending: Promise<RuntimeConfig> | undefined;

function parse(d: Record<string, unknown>): RuntimeConfig {
  const platformApiUrl = String(d.platformApiUrl ?? "").trim().replace(/\/+$/, "");
  const u = new URL(platformApiUrl); // throws on a missing or relative URL
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("platformApiUrl must be http(s)");
  return { platformApiUrl, languageToggle: d.languageToggle !== false };
}

/** Loaded once per page; a failure is not cached, so the caller can retry. */
export function loadConfig(): Promise<RuntimeConfig> {
  pending ??= fetch("/config.json", { cache: "no-store", credentials: "omit" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`config.json responded ${res.status}`);
      return parse(await res.json());
    })
    .catch((err) => {
      pending = undefined;
      throw err;
    });
  return pending;
}
