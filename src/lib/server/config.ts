import "server-only";

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Runtime configuration. Everything here is read when the server starts, so one
 * build serves every environment.
 */
export const config = {
  isProd,
  /** Public base URL of this page (https in production), e.g. https://id.bhutanndi.com (DL-012). */
  appBaseUrl: (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),

  /**
   * Base URL of the platform api-gateway that serves the public hosted endpoints
   * (`/verification/hosted/:hostedId` and `/status`). The browser calls it directly.
   */
  platformApiUrl: (process.env.PLATFORM_API_URL ?? "").trim().replace(/\/+$/, ""),

  /** Design QA gallery at /preview (demo data, every screen). Off in production unless ENABLE_PREVIEW=true. */
  previewEnabled: bool("ENABLE_PREVIEW", !isProd),

  /** Show the EN / Dzongkha switch. When off, every page is in English. */
  languageToggle: bool("ENABLE_LANGUAGE_TOGGLE", true),

  logLevel: (process.env.LOG_LEVEL ?? (isProd ? "info" : "debug")) as "debug" | "info" | "warn" | "error",
};

/** Problems that must stop the server from starting. */
export function configErrors(): string[] {
  const errors: string[] = [];
  const c = config;

  try {
    const u = new URL(c.appBaseUrl);
    if (c.isProd && u.protocol !== "https:") errors.push("APP_BASE_URL must be https in production");
  } catch {
    errors.push("APP_BASE_URL must be an absolute URL");
  }

  if (!c.platformApiUrl) {
    errors.push("PLATFORM_API_URL is required (the platform api-gateway base URL)");
  } else {
    try {
      const u = new URL(c.platformApiUrl);
      if (c.isProd && u.protocol !== "https:") errors.push("PLATFORM_API_URL must be https in production");
    } catch {
      errors.push("PLATFORM_API_URL must be an absolute URL");
    }
  }

  return errors;
}
