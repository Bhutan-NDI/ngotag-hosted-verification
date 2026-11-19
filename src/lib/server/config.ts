import "server-only";

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

function json<T>(name: string, fallback: T, errors: string[]): T {
  const raw = process.env[name];
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    errors.push(`${name} is not valid JSON`);
    return fallback;
  }
}

export interface ProofAttribute {
  name: string;
  restrictions?: Record<string, string>[];
}

/** A service allowed to send users to the hosted page. */
export interface Partner {
  id: string;
  /** Shown to the user: "<name> wants to verify your identity". */
  name: string;
  apiKey: string;
  /** Origins the user may be redirected back to, e.g. https://service.gov.bt */
  redirectOrigins: string[];
}

const isProd = process.env.NODE_ENV === "production";
const parseErrors: string[] = [];

export const config = {
  isProd,
  appBaseUrl: (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  /** Mock NDI: defaults on in development, off in production. */
  mock: bool("NDI_MOCK", !isProd),
  allowMockInProduction: bool("NDI_MOCK_ALLOW_IN_PRODUCTION", false),
  /** /preview gallery: on with mock, otherwise opt-in. */
  previewEnabled: bool("ENABLE_PREVIEW", bool("NDI_MOCK", !isProd)),

  /** Show the EN / Dzongkha switch. When off, every page is in English. */
  languageToggle: bool("ENABLE_LANGUAGE_TOGGLE", true),

  redisUrl: process.env.REDIS_URL ?? "",
  logLevel: (process.env.LOG_LEVEL ?? (isProd ? "info" : "debug")) as "debug" | "info" | "warn" | "error",

  ndi: {
    clientId: process.env.NDI_CLIENT_ID ?? "",
    clientSecret: process.env.NDI_CLIENT_SECRET ?? "",
    authUrl: process.env.NDI_AUTH_URL ?? "https://staging.bhutanndi.com/authentication/v1/authenticate",
    verifierUrl: process.env.NDI_VERIFIER_URL ?? "https://demo-client.bhutanndi.com/verifier/v1/proof-request",
    webhookApiUrl: process.env.NDI_WEBHOOK_API_URL ?? "https://demo-client.bhutanndi.com/webhook/v1",
    webhookId: process.env.NDI_WEBHOOK_ID ?? "",
    webhookToken: process.env.NDI_WEBHOOK_TOKEN ?? "",
    requestTimeoutMs: num("NDI_REQUEST_TIMEOUT_MS", 10_000),
    defaultProofName: process.env.NDI_DEFAULT_PROOF_NAME ?? "Verify identity",
    defaultProofAttributes: json<ProofAttribute[]>(
      "NDI_DEFAULT_PROOF_ATTRIBUTES",
      [{ name: "Full Name" }, { name: "ID Number" }],
      parseErrors,
    ),
  },

  partners: json<Partner[]>("PARTNERS", [], parseErrors),

  proofTtlMs: num("PROOF_TTL_SECONDS", 300) * 1000,
  approvalTimeoutMs: num("APPROVAL_TIMEOUT_SECONDS", 120) * 1000,
  sessionTtlMs: num("SESSION_TTL_SECONDS", 1800) * 1000,

  rateLimit: {
    /** Session creation per partner key per minute. */
    createPerMinute: num("RATE_LIMIT_CREATE_PER_MINUTE", 120),
    /** Proof request creation per client IP per minute. */
    proofPerMinute: num("RATE_LIMIT_PROOF_PER_MINUTE", 20),
  },
};

/** Problems that must stop the server from starting. */
export function configErrors(): string[] {
  const errors = [...parseErrors];
  const c = config;

  try {
    const u = new URL(c.appBaseUrl);
    if (c.isProd && u.protocol !== "https:") errors.push("APP_BASE_URL must be https in production");
  } catch {
    errors.push("APP_BASE_URL must be an absolute URL");
  }

  if (c.isProd && c.mock && !c.allowMockInProduction) {
    errors.push(
      "NDI_MOCK=true in production exposes test endpoints. Set NDI_MOCK=false (or NDI_MOCK_ALLOW_IN_PRODUCTION=true for a staging box).",
    );
  }

  if (!c.mock) {
    if (!c.ndi.clientId || !c.ndi.clientSecret) errors.push("NDI_CLIENT_ID and NDI_CLIENT_SECRET are required");
    if (!c.ndi.webhookId) errors.push("NDI_WEBHOOK_ID is required");
    if (c.ndi.webhookToken.length < 32) errors.push("NDI_WEBHOOK_TOKEN must be at least 32 characters");
  }

  if (c.isProd && !c.redisUrl) {
    errors.push("REDIS_URL is required in production (sessions must survive restarts and be shared across instances)");
  }

  if (!Array.isArray(c.partners)) {
    errors.push("PARTNERS must be a JSON array");
  } else {
    if (c.isProd && c.partners.length === 0) errors.push("PARTNERS must define at least one partner");
    const ids = new Set<string>();
    for (const p of c.partners) {
      const label = `PARTNERS[${p?.id ?? "?"}]`;
      if (!p?.id || !p.name || !p.apiKey || !Array.isArray(p.redirectOrigins)) {
        errors.push(`${label} needs id, name, apiKey and redirectOrigins`);
        continue;
      }
      if (ids.has(p.id)) errors.push(`${label} duplicate id`);
      ids.add(p.id);
      if (c.isProd && p.apiKey.length < 32) errors.push(`${label} apiKey must be at least 32 characters`);
      for (const o of p.redirectOrigins) {
        try {
          const u = new URL(o);
          if (u.origin !== o) errors.push(`${label} redirect origin "${o}" must be an origin like https://host`);
          if (c.isProd && u.protocol !== "https:") errors.push(`${label} redirect origin "${o}" must be https`);
        } catch {
          errors.push(`${label} redirect origin "${o}" is not a URL`);
        }
      }
    }
  }
  return errors;
}
