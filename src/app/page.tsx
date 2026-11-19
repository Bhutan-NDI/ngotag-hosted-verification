import Link from "next/link";
import { notFound } from "next/navigation";
import { config } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/**
 * The hosted page has no landing page — users only arrive via /v/<id>.
 * In mock mode this shows a small developer launcher instead.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string }>;
}) {
  if (!config.mock) notFound();
  const { status, session_id } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-[420px] rounded-2xl border border-line bg-surface px-6 py-8 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Developer · mock NDI</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Bhutan NDI hosted page</h1>

        {status && (
          <p className="mt-4 rounded-xl bg-neutral-soft px-4 py-3 text-sm">
            Last session returned <span className="font-semibold">{status}</span>
            {session_id && <span className="block truncate text-xs text-subtle">{session_id}</span>}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <a
            href="/api/dev/start"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover"
          >
            Start a test session
          </a>
          <Link
            href="/preview"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-line text-[15px] font-semibold text-ink hover:bg-neutral-soft"
          >
            View all screens
          </Link>
        </div>
      </section>
    </main>
  );
}
