import "server-only";
import { randomBytes } from "node:crypto";
import type { HostedRequest, HostedStatus, HostedStatusResponse } from "@/lib/types";
import { config } from "./config";

/**
 * In-memory stand-in for the platform's hosted session (HVP-SD §5.2), for local
 * development only (MOCK_PLATFORM=true). It mimics ngotag-platform
 * (feat/verification/hosted-session + hosted-scanned):
 * - one deadline (DL-017): `pending`/`scanned` until expiresAt + 30 s grace, then `expired`,
 *   then not-found one more grace period later;
 * - `scanned` optional (DL-016); a decline is reported as `failed` (there is no `declined`);
 * - returnUrl only on completed or failed, and none once the code has been used;
 * - the deep link carries no returnUrl, so the wallet cannot bring the user back.
 */

interface MockSession extends HostedRequest {
  status: HostedStatus;
  responseCode?: string;
  /** The relying party exchanged the code: status keeps the outcome, without returnUrl. */
  codeUsed?: boolean;
  expiresInSeconds: number;
}

/** REQUEST_DEADLINE_GRACE_SECONDS on the platform. */
const GRACE_MS = 30_000;
const g = globalThis as unknown as { __mockHosted?: Map<string, MockSession> };
const sessions = (g.__mockHosted ??= new Map());

export function createMockSession(ttlSeconds = 600): string {
  const hostedId = randomBytes(32).toString("base64url"); // 43 chars, like platform
  const thread = randomBytes(8).toString("hex");
  const redirectUri = `${config.appBaseUrl}/`;
  sessions.set(hostedId, {
    status: "pending",
    returnHost: new URL(redirectUri).host,
    redirectUri,
    proofRequestURL: `https://mock.bhutanndi.local/oob?thread=${thread}`,
    // Like the platform, the page gets the deep link without returnUrl (the code must not reach it early).
    deepLinkURL: `https://bhutanndi.app.link/?t=${thread}`,
    expiresAt: Date.now() + ttlSeconds * 1000,
    expiresInSeconds: ttlSeconds,
  });
  return hostedId;
}

/** Applies the deadline; undefined once the session is gone. */
function current(hostedId: string): MockSession | undefined {
  const s = sessions.get(hostedId);
  if (!s) return undefined;
  const now = Date.now();
  // The hosted session outlives the code session by one more grace period.
  if (now > s.expiresAt + 2 * GRACE_MS) {
    sessions.delete(hostedId);
    return undefined;
  }
  // Pending through the grace period: a late result is still delivered.
  if (now > s.expiresAt + GRACE_MS && (s.status === "pending" || s.status === "scanned")) s.status = "expired";
  return s;
}

/** Shape of the platform response: the request plus its lifetime in seconds. */
export function getMockRequest(hostedId: string): (Omit<HostedRequest, "validForSeconds"> & { expiresInSeconds: number }) | undefined {
  const s = current(hostedId);
  if (!s) return undefined;
  const { returnHost, redirectUri, proofRequestURL, deepLinkURL, expiresAt, expiresInSeconds } = s;
  return { returnHost, redirectUri, proofRequestURL, deepLinkURL, expiresAt, expiresInSeconds };
}

export function getMockStatus(hostedId: string): HostedStatusResponse | undefined {
  const s = current(hostedId);
  if (!s) return undefined;
  if ((s.status === "completed" || s.status === "failed") && !s.codeUsed) {
    const u = new URL(s.redirectUri);
    u.searchParams.set("response_code", s.responseCode!);
    return { status: s.status, returnUrl: u.toString() };
  }
  return { status: s.status };
}

/** The mock relying party exchanged this code, as a real one does through callback-result. */
export function markMockCodeUsed(responseCode: string): void {
  for (const s of sessions.values()) {
    if (s.responseCode === responseCode) s.codeUsed = true;
  }
}

export type MockAction = "scan" | "complete" | "decline" | "fail" | "expire";

export function simulateMock(hostedId: string, action: MockAction): HostedStatusResponse | undefined {
  const s = current(hostedId);
  if (!s) return undefined;
  const open = s.status === "pending" || s.status === "scanned";
  switch (action) {
    case "scan":
      if (s.status === "pending") s.status = "scanned";
      break;
    case "complete":
    case "decline":
    case "fail":
      if (open) {
        // The platform reports a decline as `failed`.
        s.status = action === "complete" ? "completed" : "failed";
        s.responseCode = `mock_${randomBytes(12).toString("base64url")}`;
      }
      break;
    case "expire":
      // Past the deadline and its grace, so the status is `expired` at once.
      if (open) s.expiresAt = Date.now() - GRACE_MS - 1;
      break;
  }
  return getMockStatus(hostedId);
}
