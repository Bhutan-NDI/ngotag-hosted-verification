import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request nonce Content-Security-Policy. Next.js reads the nonce from the
 * request's CSP header and applies it to its own inline scripts.
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'${dev ? " ws:" : ""}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // ?lang=en|dz lets partners link straight to a language; it's remembered.
  const lang = req.nextUrl.searchParams.get("lang");
  const validLang = lang === "en" || lang === "dz" ? lang : null;
  if (validLang) {
    req.cookies.set("ndi_lang", validLang);
    requestHeaders.set("cookie", req.cookies.toString());
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  if (validLang) {
    res.cookies.set("ndi_lang", validLang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
    });
  }
  return res;
}

export const config = {
  matcher: [
    {
      // Pages only — skip API routes, static assets and prefetches.
      source: "/((?!api|_next/static|_next/image|favicon.ico|badges|.*\\.(?:png|svg|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
