import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PublicSession, SessionStatus } from "@/lib/types";
import { config, type Partner, type ProofAttribute } from "./config";
import { log } from "./log";
import { createProofRequest, type WebhookOutcome } from "./ndi";
import { store, type Session } from "./store";

const TERMINAL: SessionStatus[] = ["verified", "declined", "failed", "expired", "timed_out", "cancelled", "completed"];
const isTerminal = (s: SessionStatus) => TERMINAL.includes(s);

/** Session ids are 22 base64url chars (128 bits). */
const ID_RE = /^[A-Za-z0-9_-]{22}$/;
export const isSessionId = (id: string) => ID_RE.test(id);

export class SessionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Resolve a partner from an `Authorization: Bearer <key>` header. */
export function partnerFromAuth(header: string | null): Partner | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  const given = sha(header.slice(7).trim());
  let found: Partner | undefined;
  // Compare against every key (constant time per key, no early exit).
  for (const p of config.partners) {
    if (timingSafeEqual(given, sha(p.apiKey))) found = p;
  }
  return found;
}

export function bearerMatches(header: string | null, expected: string): boolean {
  if (!expected || !header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(sha(header.slice(7).trim()), sha(expected));
}

// ---------------------------------------------------------------------------
// Creation & lookup
// ---------------------------------------------------------------------------

export interface CreateSessionInput {
  redirectUri: string;
  state?: string;
  proofName?: string;
  proofAttributes?: ProofAttribute[];
}

function validAttributes(v: unknown): v is ProofAttribute[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 50 &&
    v.every((a) => a && typeof a === "object" && typeof (a as ProofAttribute).name === "string")
  );
}

export async function createSession(partner: Pick<Partner, "id" | "name" | "redirectOrigins">, input: CreateSessionInput) {
  let redirect: URL;
  try {
    redirect = new URL(input.redirectUri);
  } catch {
    throw new SessionError("redirectUri must be an absolute URL", 400);
  }
  if (!partner.redirectOrigins.includes(redirect.origin)) {
    throw new SessionError(`redirectUri origin ${redirect.origin} is not allowed for this partner`, 400);
  }
  if (input.state !== undefined && (typeof input.state !== "string" || input.state.length > 512)) {
    throw new SessionError("state must be a string of at most 512 characters", 400);
  }
  if (input.proofName !== undefined && (typeof input.proofName !== "string" || input.proofName.length > 200)) {
    throw new SessionError("proofName must be a string of at most 200 characters", 400);
  }
  if (input.proofAttributes !== undefined && !validAttributes(input.proofAttributes)) {
    throw new SessionError("proofAttributes must be a non-empty array of { name, restrictions? }", 400);
  }

  const now = Date.now();
  const session: Session = {
    id: randomBytes(16).toString("base64url"),
    version: 0,
    status: "created",
    partnerId: partner.id,
    partnerName: partner.name,
    redirectUri: redirect.toString(),
    state: input.state,
    proofName: input.proofName ?? config.ndi.defaultProofName,
    proofAttributes: input.proofAttributes ?? config.ndi.defaultProofAttributes,
    createdAt: now,
    sessionExpiresAt: now + config.sessionTtlMs,
  };
  await store().create(session);
  log.info("session created", { sessionId: session.id, partnerId: partner.id });
  return session;
}

/** Apply passed deadlines; null if nothing changes. */
function withDeadlines(s: Session, now = Date.now()): Session | null {
  if (s.status === "pending" && s.proofExpiresAt && now > s.proofExpiresAt) {
    return { ...s, status: "expired" };
  }
  if (s.status === "scanned" && s.scannedAt && now > s.scannedAt + config.approvalTimeoutMs) {
    return { ...s, status: "timed_out" };
  }
  return null;
}

/**
 * Read a session and apply any deadlines that have passed.
 * Returns undefined for unknown or fully-expired sessions.
 */
export async function getSession(id: string): Promise<Session | undefined> {
  if (!isSessionId(id)) return undefined;
  const s = await store().get(id);
  if (!s) return undefined;
  if (Date.now() > s.sessionExpiresAt && s.status !== "completed") return undefined;
  if (!withDeadlines(s)) return s;
  return store().update(id, (cur) => withDeadlines(cur));
}

export function toPublic(s: Session): PublicSession {
  const live = s.status === "pending" || s.status === "scanned";
  return {
    id: s.id,
    status: s.status,
    partnerName: s.partnerName,
    partnerHost: new URL(s.redirectUri).host,
    proofRequestURL: live ? s.proofRequestURL : undefined,
    deepLinkURL: live ? s.deepLinkURL : undefined,
    expiresAt: s.status === "pending" ? s.proofExpiresAt : undefined,
    approvalDeadline: s.status === "scanned" && s.scannedAt ? s.scannedAt + config.approvalTimeoutMs : undefined,
    outcome: s.status === "completed" ? s.outcome : undefined,
    canRestart:
      (s.status === "expired" || s.status === "timed_out" || s.status === "created") &&
      Date.now() < s.sessionExpiresAt,
  };
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Ensure the session has a live proof request. Idempotent while pending, and
 * issues a fresh request after expiry / approval timeout ("Start again").
 */
export async function startProof(id: string): Promise<Session> {
  const s = await getSession(id);
  if (!s) throw new SessionError("Session not found", 404);
  if (s.status === "pending" || s.status === "scanned") return s;
  if (!(s.status === "created" || s.status === "expired" || s.status === "timed_out")) {
    throw new SessionError(`Session is ${s.status}`, 409);
  }

  const proof = await createProofRequest(s.proofName, s.proofAttributes);

  const updated = await store().update(id, (cur) => {
    // Someone else (another tab) already started one — keep theirs.
    if (!(cur.status === "created" || cur.status === "expired" || cur.status === "timed_out")) return null;
    return {
      ...cur,
      status: "pending",
      threadId: proof.threadId,
      proofRequestURL: proof.proofRequestURL,
      deepLinkURL: proof.deepLinkURL,
      proofExpiresAt: Math.min(Date.now() + config.proofTtlMs, cur.sessionExpiresAt),
      scannedAt: undefined,
    };
  });
  if (!updated) throw new SessionError("Session not found", 404);
  if (updated.status !== "pending" && updated.status !== "scanned") {
    throw new SessionError(`Session is ${updated.status}`, 409);
  }
  log.info("proof request ready", { sessionId: id, threadId: updated.threadId });
  return updated;
}

/** Apply a normalised NDI webhook event. Returns false if it was ignored. */
export async function applyWebhook(evt: WebhookOutcome): Promise<boolean> {
  const id = await store().idForThread(evt.threadId);
  if (!id) return false;
  let applied = false;

  await store().update(id, (raw) => {
    const s = withDeadlines(raw) ?? raw;
    // Ignore events for superseded proof requests or finished sessions.
    if (s.threadId !== evt.threadId || isTerminal(s.status)) return s === raw ? null : s;
    applied = true;
    switch (evt.kind) {
      case "scanned":
        if (s.status !== "pending") {
          applied = false;
          return s === raw ? null : s;
        }
        return { ...s, status: "scanned", scannedAt: Date.now() };
      case "verified":
        return { ...s, status: "verified", result: evt.attributes };
      case "declined":
        return { ...s, status: "declined" };
      case "failed":
        return { ...s, status: "failed" };
    }
  });

  log.info("webhook event", { sessionId: id, kind: evt.kind, applied });
  return applied;
}

/**
 * Called when the user leaves the hosted page back to the partner.
 * Marks the session completed and returns the partner redirect URL.
 */
export async function completeSession(id: string): Promise<string | null> {
  const s = await getSession(id);
  if (!s) return null;

  const done = await store().update(id, (cur) => {
    if (cur.status === "completed") return null;
    const outcome: SessionStatus = isTerminal(cur.status) ? cur.status : "cancelled";
    return { ...cur, status: "completed", outcome };
  });
  if (!done) return null;

  const url = new URL(done.redirectUri);
  url.searchParams.set("session_id", done.id);
  url.searchParams.set("status", done.outcome ?? "cancelled");
  if (done.state) url.searchParams.set("state", done.state);
  log.info("session completed", { sessionId: id, outcome: done.outcome });
  return url.toString();
}

// ---------------------------------------------------------------------------
// Dev simulation (NDI_MOCK only)
// ---------------------------------------------------------------------------

export type SimulateAction = "scan" | "approve" | "decline" | "fail" | "expire" | "timeout" | "cancel";

export async function simulate(id: string, action: SimulateAction): Promise<Session> {
  const s = await getSession(id);
  if (!s) throw new SessionError("Session not found", 404);
  const thread = s.threadId ?? "";
  const now = Date.now();

  switch (action) {
    case "scan":
      await applyWebhook({ threadId: thread, kind: "scanned" });
      break;
    case "approve":
      await applyWebhook({
        threadId: thread,
        kind: "verified",
        attributes: { "Full Name": "Karma Wangmo", "ID Number": "11*********" },
      });
      break;
    case "decline":
      await applyWebhook({ threadId: thread, kind: "declined" });
      break;
    case "fail":
      await applyWebhook({ threadId: thread, kind: "failed", reason: "ProofNotValidated" });
      break;
    case "expire":
      await store().update(id, (c) => (c.status === "pending" ? { ...c, proofExpiresAt: now - 1 } : null));
      break;
    case "timeout":
      await store().update(id, (c) =>
        c.status === "scanned" ? { ...c, scannedAt: now - config.approvalTimeoutMs - 1 } : null,
      );
      break;
    case "cancel":
      await store().update(id, (c) => (isTerminal(c.status) ? null : { ...c, status: "cancelled" }));
      break;
  }
  return (await getSession(id)) ?? s;
}
