"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { CODE_MARGIN_MS, flowReducer, initialFlow } from "@/lib/flow";
import { fetchHostedRequest, fetchHostedStatus, NotFoundError, RateLimitedError } from "@/lib/platform";
import type { DeviceMode } from "@/lib/types";
import { Frame, StateView } from "./views";

/** Polling rules (DL-008). */
const FAST_POLL_MS = 2000; // first minute
const SLOW_POLL_MS = 4000; // after that (3–5 s)
const FAST_PHASE_MS = 60_000;
const MAX_BACKOFF_MS = 15_000;
const ERRORS_BEFORE_RECONNECTING = 2;
/**
 * The platform reports `pending` until the deadline plus its 30 s grace (REQUEST_DEADLINE_GRACE_SECONDS),
 * so a result that lands just after the deadline is still delivered. Keep listening that long, plus a margin.
 */
const LISTEN_AFTER_DEADLINE_MS = 35_000;

const OPEN_TIMEOUT_MS = 4000;
/** Brief "Done" before leaving: the terminal session is kept only ~60 s (HVP-SD §5.6, E4). */
const RETURN_DELAY_MS = 600;

interface Props {
  hostedId: string;
  apiBaseUrl: string;
  mode: DeviceMode;
}

export function HostedFlow({ hostedId, apiBaseUrl, mode }: Props) {
  const [state, dispatch] = useReducer(flowReducer, initialFlow);
  const { view, session, settled } = state;
  const loaded = Boolean(session);
  const expiresAt = session?.expiresAt;
  const channelRef = useRef<BroadcastChannel | null>(null);
  /** This tab has announced it is returning: it no longer stands down for another tab. */
  const committedRef = useRef(false);

  /**
   * Server time (DL-021): offset = serverTime − device time, updated from every answer that
   * carries `serverTime`. The deadline, the polling stop and the code lifetime are judged on
   * server time, so a phone whose clock is off neither expires early nor late. Without the
   * field (older platform) the offset stays 0: the device clock.
   */
  const offsetRef = useRef(0);
  const now = useCallback(() => Date.now() + offsetRef.current, []);
  const syncClock = useCallback((serverTime?: number) => {
    if (serverTime !== undefined) offsetRef.current = serverTime - Date.now();
  }, []);

  /* -- 1. Load the request once (retry with back-off on network errors) ---- */
  useEffect(() => {
    if (loaded) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;

    const load = async () => {
      try {
        const request = await fetchHostedRequest(apiBaseUrl, hostedId, ctrl.signal);
        syncClock(request.serverTime);
        dispatch({ type: "connection-restored" });
        dispatch({ type: "loaded", hostedId, request, now: now() });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        if (err instanceof NotFoundError) return dispatch({ type: "not-found" });
        attempt += 1;
        if (!(err instanceof RateLimitedError) && attempt >= ERRORS_BEFORE_RECONNECTING) {
          dispatch({ type: "connection-lost" });
        }
        timer = setTimeout(load, Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS));
      }
    };
    load();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [apiBaseUrl, hostedId, loaded, now, syncClock]);

  /* -- 2. Poll status (DL-008): fast then slow, pause when hidden, back off -- */
  useEffect(() => {
    if (!loaded || settled || expiresAt === undefined) return;
    const ctrl = new AbortController();
    const stopAt = expiresAt + LISTEN_AFTER_DEADLINE_MS;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let errors = 0;
    let inFlight = false;

    const schedule = () => {
      clearTimeout(timer);
      if (ctrl.signal.aborted || document.visibilityState === "hidden") return; // paused
      if (now() >= stopAt) return; // the platform can no longer change the answer
      const base = Date.now() - startedAt < FAST_PHASE_MS ? FAST_POLL_MS : SLOW_POLL_MS;
      const delay = errors ? Math.min(base * 2 ** errors, MAX_BACKOFF_MS) : base;
      timer = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (inFlight || ctrl.signal.aborted || now() >= stopAt) return;
      inFlight = true;
      try {
        const response = await fetchHostedStatus(apiBaseUrl, hostedId, ctrl.signal);
        syncClock(response.serverTime);
        if (errors) dispatch({ type: "connection-restored" });
        errors = 0;
        dispatch({ type: "status", response, now: now() });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        // The session is gone — used by the service, or lapsed in the background (Figma 17).
        if (err instanceof NotFoundError) {
          dispatch({ type: "gone" });
          return;
        }
        errors += 1;
        // A 429 only means "slower": back off quietly instead of showing "Reconnecting".
        if (!(err instanceof RateLimitedError) && errors >= ERRORS_BEFORE_RECONNECTING) {
          dispatch({ type: "connection-lost" });
        }
      } finally {
        inFlight = false;
      }
      schedule();
    };

    // Check at once when the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    poll();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [apiBaseUrl, hostedId, loaded, settled, expiresAt, now, syncClock]);

  /* -- 3. The shared deadline (DL-017): expire even if nothing was scanned -----
   * Only the screen changes; polling goes on through the platform's grace period (see 2). */
  useEffect(() => {
    if (!expiresAt || settled) return;
    // setTimeout overflows above ~24.8 days; no request lives that long.
    const delay = Math.min(Math.max(0, expiresAt - now()), 2 ** 31 - 1);
    const t = setTimeout(() => dispatch({ type: "deadline" }), delay);
    return () => clearTimeout(t);
  }, [expiresAt, settled, now]);

  /* -- 3b. Code lifetime (DL-021): stop offering returnUrl ~5 s before it lapses --
   * Every button then falls back to its reason link; a tab still in "returning" stands down. */
  const codeUrl = session?.returnUrl;
  const codeExpiresAt = session?.returnUrlExpiresAt;
  useEffect(() => {
    if (!codeUrl || codeExpiresAt === undefined) return;
    const delay = Math.min(Math.max(0, codeExpiresAt - CODE_MARGIN_MS - now()), 2 ** 31 - 1);
    const t = setTimeout(() => dispatch({ type: "code-expired" }), delay);
    return () => clearTimeout(t);
  }, [codeUrl, codeExpiresAt, now]);

  /* -- 4. Wallet deep link: "still opening", and leaving for the app -------- */
  useEffect(() => {
    if (view !== "opening") return;
    const t = setTimeout(() => dispatch({ type: "open-timeout" }), OPEN_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [view]);

  useEffect(() => {
    if (view !== "opening" && view !== "still-opening") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") dispatch({ type: "page-hidden" });
    };
    const onPageHide = () => dispatch({ type: "page-hidden" });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [view]);

  const deepLink = session?.deepLinkURL;
  const openWallet = useCallback(() => {
    if (!deepLink) return;
    dispatch({ type: "tap-deep-link" });
    window.location.href = deepLink;
  }, [deepLink]);

  /* -- 5. Same page open in two tabs: only one returns with the code --------- */
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`ndi-hosted-${hostedId}`);
    channelRef.current = ch;
    ch.onmessage = (e) => {
      // Once this tab has committed, ignore the other's message: two visible windows would
      // otherwise cancel each other and neither would return.
      if (e.data === "returning" && !committedRef.current) dispatch({ type: "returned-elsewhere" });
    };
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [hostedId]);

  /* -- 6. Completed in QR mode: go back with the response_code at once ---------
   * The only automatic navigation (DL-019(1)). After the deep link the wallet opens returnUrl
   * itself (DL-007), so the flow never enters "returning" there. */
  const returnUrl = session?.returnUrl;
  const navigated = useRef(false);
  useEffect(() => {
    if (view !== "returning" || !returnUrl || navigated.current) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      committedRef.current = true;
      channelRef.current?.postMessage("returning");
      t = setTimeout(() => {
        navigated.current = true;
        window.location.replace(returnUrl);
      }, RETURN_DELAY_MS);
    };
    // A background tab waits until it is visible, so the tab in front wins.
    if (document.visibilityState === "visible") {
      go();
      return () => clearTimeout(t);
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVisible);
      go();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(t);
    };
  }, [view, returnUrl]);

  return (
    <Frame mode={mode}>
      <StateView
        view={view}
        mode={mode}
        session={session}
        onOpenWallet={openWallet}
        onShowQr={() => dispatch({ type: "show-qr" })}
        onHideQr={() => dispatch({ type: "hide-qr" })}
      />
    </Frame>
  );
}
