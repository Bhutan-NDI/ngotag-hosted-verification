import type { HostedRequest, HostedStatusResponse, PublicSession } from "./types";

/** Every screen of the hosted page (UX-HVP-01, constrained by HVP-SD §5.6). */
export type View =
  | "loading"
  | "ready" // mobile: "Open Bhutan NDI" button · web: QR code
  | "opening" // mobile: launching the wallet deep link
  | "still-opening" // mobile: wallet didn't open after ~4s
  | "qr" // mobile: "Use a QR code instead"
  | "scanned" // the wallet connected; approve in the wallet (DL-016)
  | "waiting" // deep link tapped: approve in the wallet, then come back to this tab
  | "returning" // completed: redirect to returnUrl now (§5.6), on laptop and phone alike
  | "returned" // done, but nothing left to hand over (code already used, or gone after the deep link)
  | "declined" // the citizen chose Decline: "Nothing was shared" (Figma 11)
  | "failed" // not completed for another reason; link back to returnUrl (§5.6)
  | "expired" // deadline passed / platform says expired: "Start again at …" (DL-013)
  | "timed-out" // expired while scanned: "You did not approve in time" (DL-016)
  | "not-found" // unknown or already-expired link: generic message, no link (DL-013)
  | "gone" // the request vanished mid-flow (status 404): "no longer available" + way back (Figma 17)
  | "reconnecting"; // polling errors; keep the page open

const PENDING_VIEWS: View[] = ["ready", "opening", "still-opening", "qr"];
const EXPIRED_VIEWS: View[] = ["expired", "timed-out"];

export interface FlowState {
  view: View;
  session?: PublicSession;
  /** The user tapped "Open Bhutan NDI": never redirect on our own from here (DL-007). */
  tappedDeepLink: boolean;
  /** Whether a `scanned` status was seen, to tell "expired" from "did not approve in time". */
  wasScanned: boolean;
  /** View to go back to once polling recovers. */
  resumeView?: View;
  /**
   * The platform gave a final answer (or the request is gone): stop polling, never change again.
   * The page's own deadline does NOT settle it: the platform keeps a request open for a grace
   * period after `expiresAt` (REQUEST_DEADLINE_GRACE_SECONDS), so a late approval still returns the user.
   */
  settled: boolean;
}

export type FlowAction =
  | { type: "loaded"; hostedId: string; request: HostedRequest }
  | { type: "not-found" }
  | { type: "gone" }
  | { type: "status"; response: HostedStatusResponse }
  | { type: "deadline" }
  | { type: "tap-deep-link" }
  | { type: "open-timeout" }
  | { type: "page-hidden" }
  | { type: "show-qr" }
  | { type: "hide-qr" }
  | { type: "connection-lost" }
  | { type: "connection-restored" }
  /** Another tab of this page is returning with the code (BroadcastChannel). */
  | { type: "returned-elsewhere" };

export const initialFlow: FlowState = { view: "loading", tappedDeepLink: false, wasScanned: false, settled: false };

function expiredView(state: FlowState): View {
  return state.wasScanned || state.view === "scanned" ? "timed-out" : "expired";
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  // Another tab is returning with the code. A tab still waiting in "returning" (in the
  // background, not yet navigated) must stand down too, or it would reuse the code later.
  // Drop returnUrl too: its response_code is being used by the other tab, so no Return button.
  if (action.type === "returned-elsewhere" && state.view === "returning") {
    const session = state.session && { ...state.session, returnUrl: undefined };
    return { ...state, session, view: "returned", resumeView: undefined, settled: true };
  }
  // Final answers never change again — e.g. a late status can't undo "returning".
  if (state.settled) return state;

  switch (action.type) {
    case "loaded":
      return {
        ...state,
        view: Date.now() >= action.request.expiresAt ? "expired" : "ready",
        session: { ...action.request, hostedId: action.hostedId, status: "pending" },
      };

    case "not-found":
      return { ...state, view: "not-found", settled: true };

    // The status check stopped finding a loaded request. After the deep link the
    // service has usually used the code already, so show "All done here" (Figma 7).
    case "gone":
      return { ...state, view: state.tappedDeepLink ? "returned" : "gone", resumeView: undefined, settled: true };

    case "status": {
      if (!state.session) return state;
      const { status, returnUrl } = action.response;
      const session = { ...state.session, status, returnUrl: returnUrl ?? state.session.returnUrl };
      const base = state.view === "reconnecting" ? (state.resumeView ?? "ready") : state.view;
      const next = { ...state, session, resumeView: undefined };
      const final = { ...next, settled: true };

      switch (status) {
        case "pending":
          return { ...next, view: base };
        case "scanned":
          // Past the page's deadline: the platform is still in its grace period; keep the expired screen.
          if (EXPIRED_VIEWS.includes(base)) return { ...next, view: "timed-out", wasScanned: true };
          // After the deep link the user is already in the wallet; keep "waiting".
          if (state.tappedDeepLink) return { ...next, view: "waiting", wasScanned: true };
          return { ...next, view: "scanned", wasScanned: true };
        case "completed":
          // The platform gives the page the deep link WITHOUT returnUrl (the code must not reach the
          // page before the proof ends), so the wallet cannot bring the user back: the page does it,
          // after the deep link too. With no returnUrl the code was already used: nothing to hand over.
          return { ...final, view: session.returnUrl ? "returning" : "returned" };
        case "declined":
          return { ...final, view: "declined" };
        case "failed":
          return { ...final, view: "failed" };
        case "expired":
          return { ...final, view: expiredView({ ...state, view: base }) };
      }
      return state;
    }

    case "deadline":
      // The deadline alone covers a QR code that was never scanned (DL-017 item 5).
      return { ...state, view: expiredView(state), resumeView: undefined };

    case "tap-deep-link":
      return { ...state, view: "opening", tappedDeepLink: true };
    case "open-timeout":
      return state.view === "opening" ? { ...state, view: "still-opening" } : state;
    case "page-hidden":
      // The wallet took focus: when the user comes back, show "waiting".
      return state.view === "opening" || state.view === "still-opening" ? { ...state, view: "waiting" } : state;

    case "show-qr":
      return PENDING_VIEWS.includes(state.view) ? { ...state, view: "qr" } : state;
    case "hide-qr":
      return state.view === "qr" ? { ...state, view: "ready" } : state;

    case "connection-lost":
      // Past the deadline the page is only listening for a late result; keep the expired screen.
      if (state.view === "reconnecting" || EXPIRED_VIEWS.includes(state.view)) return state;
      return { ...state, view: "reconnecting", resumeView: state.view };
    case "returned-elsewhere":
      return { ...state, view: "returned", resumeView: undefined, settled: true };
    case "connection-restored":
      return state.view === "reconnecting" ? { ...state, view: state.resumeView ?? "ready", resumeView: undefined } : state;
  }
}
