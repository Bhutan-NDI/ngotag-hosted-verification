import "server-only";
import { NextResponse } from "next/server";
import { log } from "./log";
import { SessionError } from "./sessions";
import { store } from "./store";

export const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Best-effort client IP. Put the app behind a proxy that sets X-Forwarded-For. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function rateLimited(key: string, limit: number, windowMs = 60_000) {
  try {
    return !(await store().hit(key, limit, windowMs));
  } catch (err) {
    // Fail open: a limiter outage shouldn't take the page down.
    log.warn("rate limiter unavailable", { err });
    return false;
  }
}

export const tooMany = () => json({ error: "too many requests" }, 429, { "Retry-After": "60" });

/** Map known errors to JSON responses; log and hide everything else. */
export function handleError(e: unknown, context: string) {
  if (e instanceof SessionError) return json({ error: e.message }, e.status);
  log.error(context, { err: e });
  return json({ error: "internal error" }, 500);
}

/** Read a JSON body with a size cap. */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
