"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { flowReducer, initialFlow, isTerminal } from "@/lib/flow";
import { fetchHostedRequest, fetchHostedStatus, NotFoundError } from "@/lib/platform";
import type { DeviceMode } from "@/lib/types";
import { Frame, StateView } from "./views";

/** Polling rules (DL-008). */
const FAST_POLL_MS = 2000; // first minute
const SLOW_POLL_MS = 4000; // after that (3–5 s)
const FAST_PHASE_MS = 60_000;
const MAX_BACKOFF_MS = 15_000;
const ERRORS_BEFORE_RECONNECTING = 2;

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
  const { view, session } = state;
  const loaded = Boolean(session);
  const terminal = isTerminal(view);

  /* -- 1. Load the request once (retry with back-off on network errors) ---- */
  useEffect(() => {
    if (loaded) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;

    const load = async () => {
      try {
        const request = await fetchHostedRequest(apiBaseUrl, hostedId, ctrl.signal);
        dispatch({ type: "connection-restored" });
        dispatch({ type: "loaded", hostedId, request });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        if (err instanceof NotFoundError) return dispatch({ type: "not-found" });
        attempt += 1;
        if (attempt >= ERRORS_BEFORE_RECONNECTING) dispatch({ type: "connection-lost" });
        timer = setTimeout(load, Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS));
      }
    };
    load();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [apiBaseUrl, hostedId, loaded]);

  /* -- 2. Poll status (DL-008): fast then slow, pause when hidden, back off -- */
  useEffect(() => {
    if (!loaded || terminal) return;
    const ctrl = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let errors = 0;
    let inFlight = false;

    const schedule = () => {
      clearTimeout(timer);
      if (ctrl.signal.aborted || document.visibilityState === "hidden") return; // paused
      const base = Date.now() - startedAt < FAST_PHASE_MS ? FAST_POLL_MS : SLOW_POLL_MS;
      const delay = errors ? Math.min(base * 2 ** errors, MAX_BACKOFF_MS) : base;
      timer = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (inFlight || ctrl.signal.aborted) return;
      inFlight = true;
      try {
        const response = await fetchHostedStatus(apiBaseUrl, hostedId, ctrl.signal);
        if (errors) dispatch({ type: "connection-restored" });
        errors = 0;
        dispatch({ type: "status", response });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        // The session is gone — used by the service, or lapsed in the background (Figma 17).
        if (err instanceof NotFoundError) {
          dispatch({ type: "gone" });
          return;
        }
        errors += 1;
        if (errors >= ERRORS_BEFORE_RECONNECTING) dispatch({ type: "connection-lost" });
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
  }, [apiBaseUrl, hostedId, loaded, terminal]);

  /* -- 3. The shared deadline (DL-017): expire even if nothing was scanned -- */
  const expiresAt = session?.expiresAt;
  useEffect(() => {
    if (!expiresAt || terminal) return;
    const t = setTimeout(() => dispatch({ type: "deadline" }), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [expiresAt, terminal]);

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

  /* -- 5. Completed (cross-device): go back with the response_code at once --- */
  const returnUrl = session?.returnUrl;
  const navigated = useRef(false);
  useEffect(() => {
    if (view !== "returning" || !returnUrl || navigated.current) return;
    const t = setTimeout(() => {
      navigated.current = true;
      window.location.replace(returnUrl);
    }, RETURN_DELAY_MS);
    return () => clearTimeout(t);
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
