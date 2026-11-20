import type { HostedRequest, HostedStatus, HostedStatusResponse, PublicSession, ReturnReason } from "./types";

/**
 * Browser client for the platform's public, read-only hosted-page endpoints (HVP-SD §5.3).
 * The page reads nothing else from its URL than the opaque hostedId (DL-003).
 */

/** hostedId: 32 random bytes, base64url → 43 characters (HVP-SD §5.2). */
const HOSTED_ID_RE = /^[A-Za-z0-9_-]{43}$/;
export const isHostedId = (id: string) => HOSTED_ID_RE.test(id);

const STATUSES: HostedStatus[] = ["pending", "scanned", "completed", "declined", "failed", "expired"];
const WITH_RETURN_URL: HostedStatus[] = ["completed", "declined", "failed"];

/** Unknown and expired ids return the same not-found result (HVP-SD §6). */
export class NotFoundError extends Error {
  constructor() {
    super("not found");
  }
}

/** 429: too many reads for this page (DL-008). Slow down; the connection itself is fine. */
export class RateLimitedError extends Error {
  constructor() {
    super("rate limited");
  }
}

/** A read that takes longer than this is abandoned, so one hung request can't stop polling. */
const REQUEST_TIMEOUT_MS = 8000;

function endpoint(apiBaseUrl: string, hostedId: string, suffix = "") {
  return `${apiBaseUrl.replace(/\/+$/, "")}/verification/hosted/${encodeURIComponent(hostedId)}${suffix}`;
}

// Hand-rolled timeout: AbortSignal.any/timeout are missing on older Safari.
async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  const timer = setTimeout(abort, REQUEST_TIMEOUT_MS);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: ctrl.signal,
    });
    if (res.status === 404 || res.status === 410) throw new NotFoundError();
    if (res.status === 429) throw new RateLimitedError();
    if (!res.ok) throw new Error(`platform responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

/** Some platforms wrap payloads as { data: … }; accept both. */
const unwrap = (v: unknown) =>
  (v && typeof v === "object" && "data" in v ? (v as { data: unknown }).data : v) as Record<string, unknown>;

/** Only accept http(s) URLs from the platform — never javascript:, data:, … */
function safeUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Epoch seconds, epoch ms or an ISO date → epoch ms; undefined if it is none of those. */
function epochMs(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? (v < 1e12 ? v * 1000 : v) : undefined;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return epochMs(n);
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return undefined;
}

export async function fetchHostedRequest(apiBaseUrl: string, hostedId: string, signal?: AbortSignal): Promise<HostedRequest> {
  const d = unwrap(await getJson(endpoint(apiBaseUrl, hostedId), signal));
  const redirectUri = safeUrl(d.redirectUri);
  const proofRequestURL = typeof d.proofRequestURL === "string" ? d.proofRequestURL : undefined;
  if (!redirectUri || !proofRequestURL) throw new Error("platform returned an incomplete request");
  return {
    returnHost: typeof d.returnHost === "string" && d.returnHost ? d.returnHost : new URL(redirectUri).host,
    redirectUri,
    proofRequestURL,
    // Deep links may use the wallet's custom scheme; only accept a string.
    deepLinkURL: typeof d.deepLinkURL === "string" && !/^\s*(javascript|data|vbscript):/i.test(d.deepLinkURL) ? d.deepLinkURL : undefined,
    expiresAt: requiredEpochMs(d.expiresAt),
    serverTime: epochMs(d.serverTime),
  };
}

function requiredEpochMs(v: unknown): number {
  const t = epochMs(v);
  if (t === undefined) throw new Error("invalid expiresAt");
  return t;
}

export async function fetchHostedStatus(apiBaseUrl: string, hostedId: string, signal?: AbortSignal): Promise<HostedStatusResponse> {
  const d = unwrap(await getJson(endpoint(apiBaseUrl, hostedId, "/status"), signal));
  const status = String(d.status ?? "").toLowerCase() as HostedStatus;
  if (!STATUSES.includes(status)) throw new Error(`unknown status "${String(d.status)}"`);
  const returnUrl = WITH_RETURN_URL.includes(status) ? safeUrl(d.returnUrl) : undefined;
  return {
    status,
    returnUrl,
    returnUrlExpiresAt: returnUrl ? epochMs(d.returnUrlExpiresAt) : undefined,
    serverTime: epochMs(d.serverTime),
  };
}

/** The relying party's redirectUri with `error=<reason>` and never a response_code (DL-013, DL-019). */
export function reasonUrl(redirectUri: string, reason: ReturnReason): string {
  const u = new URL(redirectUri);
  u.searchParams.delete("response_code");
  u.searchParams.set("error", reason);
  return u.toString();
}

/**
 * Where a return button goes (DL-019(2)): the coded returnUrl while it is still valid, otherwise
 * redirectUri with the reason. Never the bare redirectUri. The flow drops returnUrl shortly
 * before returnUrlExpiresAt, so "still valid" is simply "still present".
 */
export function returnHref(session: PublicSession, reason: ReturnReason): string {
  return session.returnUrl ?? reasonUrl(session.redirectUri, reason);
}
