"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { flowReducer, initialFlow, isLive } from "@/lib/flow";
import type { DeviceMode, PublicSession } from "@/lib/types";
import { DevPanel } from "./DevPanel";
import { Frame, StateView } from "./views";

const OPEN_TIMEOUT_MS = 4000;
const RETURN_DELAY_MS = 1500;
const PROOF_RETRY_MS = 3000;

interface Props {
  sessionId: string;
  initialSession: PublicSession | null;
  mode: DeviceMode;
  devTools: boolean;
}

export function HostedFlow({ sessionId, initialSession, mode, devTools }: Props) {
  const [state, dispatch] = useReducer(flowReducer, initialSession, initialFlow);
  const { view, session } = state;
  const live = isLive(view);
  const channelRef = useRef<BroadcastChannel | null>(null);

  /* -- 1. Create the proof request whenever we're in "loading" ------------- */
  useEffect(() => {
    if (view !== "loading") return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout>;

    const run = async () => {
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/proof`, { method: "POST" });
        if (cancelled) return;
        if (res.status === 404) return dispatch({ type: "gone" });
        if (!res.ok) throw new Error(String(res.status));
        dispatch({ type: "server", session: (await res.json()) as PublicSession });
      } catch {
        if (cancelled) return;
        retry = setTimeout(run, PROOF_RETRY_MS);
      }
    };
    run();
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [view, sessionId]);

  /* -- 2. Live status stream (SSE) while the request is active ------------- */
  useEffect(() => {
    if (!live) return;
    const es = new EventSource(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
    es.addEventListener("status", (e) => {
      dispatch({ type: "connection-restored" });
      dispatch({ type: "server", session: JSON.parse((e as MessageEvent).data) as PublicSession });
    });
    es.addEventListener("gone", () => {
      es.close();
      dispatch({ type: "gone" });
    });
    es.onopen = () => dispatch({ type: "connection-restored" });
    es.onerror = () => {
      // EventSource reconnects on its own; show the reconnecting screen meanwhile.
      if (es.readyState !== EventSource.CLOSED) dispatch({ type: "connection-lost" });
    };
    const offline = () => dispatch({ type: "connection-lost" });
    window.addEventListener("offline", offline);
    return () => {
      es.close();
      window.removeEventListener("offline", offline);
    };
    // Re-subscribe only when switching between live and not-live.
  }, [live, sessionId]);

  /* -- 3. Wallet deep link: detect "still opening" and leaving for the app - */
  useEffect(() => {
    if (view !== "opening") return;
    const t = setTimeout(() => dispatch({ type: "open-timeout" }), OPEN_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [view]);

  useEffect(() => {
    if (view !== "opening" && view !== "still-opening") return;
    const onVis = () => {
      if (document.visibilityState === "hidden") dispatch({ type: "page-hidden" });
    };
    const onBlur = () => dispatch({ type: "page-hidden" });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onBlur);
    };
  }, [view]);

  const openWallet = useCallback(() => {
    if (!session?.deepLinkURL) return;
    dispatch({ type: "tap-continue" });
    window.location.href = session.deepLinkURL;
  }, [session?.deepLinkURL]);

  /* -- 4. Cross-tab: only one tab redirects, the others say "All done" ----- */
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`ndi-session-${sessionId}`);
    channelRef.current = ch;
    ch.onmessage = (e) => {
      if (e.data === "returning") dispatch({ type: "done-elsewhere" });
    };
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [sessionId]);

  /* -- 5. Verified → short "Done" pause → back to the partner -------------- */
  useEffect(() => {
    if (view !== "returning" || !session) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      channelRef.current?.postMessage("returning");
      timer = setTimeout(() => {
        window.location.assign(`/api/sessions/${encodeURIComponent(session.id)}/return`);
      }, RETURN_DELAY_MS);
    };
    // A background tab waits until it is visible so the foreground one wins.
    if (document.visibilityState === "visible") go();
    else {
      const onVis = () => {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", onVis);
          go();
        }
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        document.removeEventListener("visibilitychange", onVis);
        clearTimeout(timer);
      };
    }
    return () => clearTimeout(timer);
  }, [view, session]);

  return (
    <Frame mode={mode}>
      <StateView
        view={view}
        mode={mode}
        session={session}
        onContinue={openWallet}
        onShowQr={() => dispatch({ type: "show-qr" })}
        onHideQr={() => dispatch({ type: "hide-qr" })}
        onRestart={() => dispatch({ type: "restart" })}
      />
      {devTools && session && <DevPanel sessionId={session.id} view={view} mode={mode} />}
    </Frame>
  );
}
