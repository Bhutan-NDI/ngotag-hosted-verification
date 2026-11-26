/**
 * Dev only. In `next dev` the page reaches the platform through this same-origin path, which
 * next.config.ts rewrites to platformApiUrl from config.dev.json. Deployed platforms allow only
 * their own hosted-page origin (CORS), so calling them directly from a dev origin would fail.
 */
export const DEV_PLATFORM_PROXY = "/__platform";
