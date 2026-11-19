import "server-only";
import { randomUUID } from "node:crypto";
import { config, type ProofAttribute } from "./config";
import { log } from "./log";

/**
 * Thin client for the Bhutan NDI verifier APIs.
 *
 * Endpoint shapes follow the NDI developer docs at the time of writing —
 * confirm field names against the current docs before going live.
 */

export interface ProofRequest {
  threadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
}

export class NdiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenInFlight: Promise<string> | null = null;

async function ndiFetch(url: string, init: RequestInit): Promise<Response> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(config.ndi.requestTimeoutMs),
    });
    log.debug("ndi request", { url, status: res.status, ms: Date.now() - started });
    return res;
  } catch (err) {
    log.warn("ndi request failed", { url, ms: Date.now() - started, err });
    throw new NdiError(`NDI unreachable: ${(err as Error).message}`);
  }
}

async function fetchToken(): Promise<string> {
  const res = await ndiFetch(config.ndi.authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.ndi.clientId,
      client_secret: config.ndi.clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new NdiError("NDI authentication failed", res.status);
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new NdiError("NDI authentication returned no token");
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function accessToken(force = false): Promise<string> {
  if (!force && cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;
  // Share one token request between concurrent callers.
  tokenInFlight ??= fetchToken().finally(() => {
    tokenInFlight = null;
  });
  return tokenInFlight;
}

/** Authenticated POST; refreshes the token once on 401. */
async function authedPost(url: string, body: unknown): Promise<Response> {
  const send = async (token: string) =>
    ndiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  let res = await send(await accessToken());
  if (res.status === 401) {
    cachedToken = null;
    res = await send(await accessToken(true));
  }
  return res;
}

export async function createProofRequest(
  proofName: string,
  proofAttributes: ProofAttribute[],
): Promise<ProofRequest> {
  if (config.mock) {
    const threadId = `mock-${randomUUID()}`;
    return {
      threadId,
      proofRequestURL: `https://mock.ndi.local/proof/${threadId}`,
      deepLinkURL: `bhutanndi://proof?thread=${threadId}`,
    };
  }

  const res = await authedPost(config.ndi.verifierUrl, { proofName, proofAttributes });
  if (!res.ok) throw new NdiError("NDI proof request failed", res.status);
  const { data } = (await res.json()) as {
    data?: { proofRequestThreadId?: string; proofRequestURL?: string; deepLinkURL?: string };
  };
  if (!data?.proofRequestThreadId || !data.proofRequestURL || !data.deepLinkURL) {
    throw new NdiError("NDI proof request returned an unexpected body");
  }

  await subscribeWebhook(data.proofRequestThreadId);

  return {
    threadId: data.proofRequestThreadId,
    proofRequestURL: data.proofRequestURL,
    deepLinkURL: data.deepLinkURL,
  };
}

/** Ask NDI to deliver events for this thread to our registered webhook. */
async function subscribeWebhook(threadId: string) {
  const res = await authedPost(`${config.ndi.webhookApiUrl}/subscribe`, {
    webhookId: config.ndi.webhookId,
    threadId,
  });
  if (!res.ok) throw new NdiError("NDI webhook subscribe failed", res.status);
}

/** Normalised result of an NDI webhook payload. */
export type WebhookOutcome =
  | { threadId: string; kind: "scanned" }
  | { threadId: string; kind: "verified"; attributes: Record<string, unknown> }
  | { threadId: string; kind: "declined" }
  | { threadId: string; kind: "failed"; reason?: string };

/**
 * Map an NDI webhook body to an outcome. NDI sends e.g.
 *   { type: "present-proof/presentation-result", thid, verification_result:
 *     "ProofValidated", requested_presentation: { revealed_attrs: {...} } }
 */
export function parseWebhook(body: unknown): WebhookOutcome | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const threadId = (b.thid ?? b.threadId ?? b.thread_id) as string | undefined;
  if (!threadId || typeof threadId !== "string") return null;

  const type = String(b.type ?? "").toLowerCase();
  const result = String(b.verification_result ?? "");

  if (type.includes("reject") || type.includes("decline") || type.includes("abandon")) {
    return { threadId, kind: "declined" };
  }
  if (type.includes("request-received") || type.includes("scanned")) {
    return { threadId, kind: "scanned" };
  }
  if (type.includes("presentation-result") || result) {
    if (result === "ProofValidated") {
      const presentation = (b.requested_presentation ?? {}) as Record<string, unknown>;
      return {
        threadId,
        kind: "verified",
        attributes: (presentation.revealed_attrs ?? presentation) as Record<string, unknown>,
      };
    }
    return { threadId, kind: "failed", reason: result || undefined };
  }
  return null;
}
