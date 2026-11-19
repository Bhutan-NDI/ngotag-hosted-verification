import { log } from "@/lib/server/log";
import { getSession, isSessionId, toPublic } from "@/lib/server/sessions";
import { store } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Close streams periodically; EventSource reconnects transparently. */
const MAX_STREAM_MS = 5 * 60 * 1000;

/**
 * Server-Sent Events stream of the session's public state.
 * Emits `status` events; `gone` when the session no longer exists.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSessionId(id)) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let last = "";
      let unsubscribe = () => {};

      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      const send = (event: string, data: unknown) => {
        const payload = JSON.stringify(data);
        if (event === "status") {
          if (payload === last) return;
          last = payload;
        }
        write(`event: ${event}\ndata: ${payload}\n\n`);
      };

      const push = async () => {
        try {
          const s = await getSession(id); // also applies expiry deadlines
          if (s) send("status", toPublic(s));
          else {
            send("gone", { id });
            close();
          }
        } catch (err) {
          log.warn("sse push failed", { sessionId: id, err });
        }
      };

      // Deadline checks + keep-alive comments for proxies.
      const tick = setInterval(() => {
        void push();
        write(`: ping\n\n`);
      }, 2000);
      const maxAge = setTimeout(() => close(), MAX_STREAM_MS);

      function close() {
        if (closed) return;
        closed = true;
        clearInterval(tick);
        clearTimeout(maxAge);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      }
      cleanup = close;

      req.signal.addEventListener("abort", close);
      write(`retry: 2000\n\n`);
      try {
        unsubscribe = await store().subscribe(id, () => void push());
      } catch (err) {
        log.warn("sse subscribe failed; falling back to polling", { sessionId: id, err });
      }
      await push();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
