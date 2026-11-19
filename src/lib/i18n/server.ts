import "server-only";
import { cookies, headers } from "next/headers";
import { config } from "@/lib/server/config";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "./messages";

/**
 * Language for this request. English is always the default.
 * Toggle off (ENABLE_LANGUAGE_TOGGLE=false): always English, so no one is stuck
 * in a language they can't switch out of.
 * Toggle on: cookie → Accept-Language → English.
 */
export async function requestLang(): Promise<Lang> {
  if (!config.languageToggle) return DEFAULT_LANG;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  if (/(^|,)\s*dz\b/i.test(accept)) return "dz";
  return DEFAULT_LANG;
}
