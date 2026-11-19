import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { config } from "@/lib/server/config";
import { createMockSession, markMockCodeUsed } from "@/lib/server/mockPlatform";

export const dynamic = "force-dynamic";

/**
 * The hosted page has no landing page — users arrive via a relying party's
 * `hostedPageUrl` (/v/<hostedId>). With MOCK_PLATFORM on, "/" plays the relying
 * party: it creates a mock request and opens its page (the QR code appears at
 * once), and it is also the mock redirectUri the page returns to.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ response_code?: string; error?: string; ttl?: string }>;
}) {
  if (!config.mockPlatform) notFound();
  const { response_code, ttl } = await searchParams;

  // No code: create a fresh request. That is also what a relying party may do on a
  // return with error=expired, since the user has just clicked "Start again" (DL-013, DL-017).
  if (!response_code) {
    const seconds = Math.min(Math.max(Number(ttl) || 600, 10), 3600); // ?ttl=30 to test expiry
    redirect(`/v/${createMockSession(seconds)}`);
  }
  // Like a real relying party: exchange the code (single use). The page then reads `completed` without returnUrl.
  markMockCodeUsed(response_code);

  return (
    <main className="flex min-h-dvh items-center justify-center px-3 py-10 min-[380px]:px-4">
      <section className="w-full max-w-[420px] rounded-2xl border border-line bg-surface px-5 py-8 min-[380px]:px-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Developer · mock relying party</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Returned with a response_code</h1>
        <p className="mt-4 break-all rounded-xl bg-canvas px-4 py-3 font-mono text-xs">{response_code}</p>
        <p className="mt-3 text-sm text-muted">
          A real relying party now exchanges this code server-to-server for the result.
        </p>
        {/* No prefetch: loading "/" creates a mock request. */}
        <Link
          href="/"
          prefetch={false}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover"
        >
          Start a new request
        </Link>
      </section>
    </main>
  );
}
