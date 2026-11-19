import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "./messages";

/** Language for this request: cookie → Accept-Language → English. */
export async function requestLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  if (/(^|,)\s*dz\b/i.test(accept)) return "dz";
  return DEFAULT_LANG;
}
