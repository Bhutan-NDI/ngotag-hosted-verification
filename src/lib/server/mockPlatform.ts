import "server-only";
import { randomBytes } from "node:crypto";
import type { HostedRequest, HostedStatus, HostedStatusResponse } from "@/lib/types";
import { config } from "./config";

/**
 * In-memory stand-in for the platform's hosted session (HVP-SD §5.2), for local
 * development only (MOCK_PLATFORM=true). It mimics the documented behaviour:
 * one deadline (DL-017), `scanned` optional (DL-016), returnUrl only on completed
 * or failed, and not-found once the session is gone (grace ~30 s after expiry).
 */

interface MockSession extends HostedRequest {
  status: HostedStatus;
  responseCode?: string;
  expiresInSeconds: number;
}

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
    deepLinkURL: `https://bhutanndi.app.link/?t=${thread}&returnUrl=${encodeURIComponent(redirectUri)}`,
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
  if (now > s.expiresAt + GRACE_MS) {
    sessions.delete(hostedId);
    return undefined;
  }
  if (now > s.expiresAt && (s.status === "pending" || s.status === "scanned")) s.status = "expired";
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
  if (s.status === "completed" || s.status === "declined" || s.status === "failed") {
    const u = new URL(s.redirectUri);
    u.searchParams.set("response_code", s.responseCode!);
    return { status: s.status, returnUrl: u.toString() };
  }
  return { status: s.status };
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
        s.status = action === "complete" ? "completed" : action === "decline" ? "declined" : "failed";
        s.responseCode = `mock_${randomBytes(12).toString("base64url")}`;
      }
      break;
    case "expire":
      if (open) s.expiresAt = Date.now() - 1;
      break;
  }
  return getMockStatus(hostedId);
}
