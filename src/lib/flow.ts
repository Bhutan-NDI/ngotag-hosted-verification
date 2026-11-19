import type { HostedRequest, HostedStatusResponse, PublicSession } from "./types";

/** Every screen of the hosted page (UX-HVP-01, constrained by HVP-SD §5.6). */
export type View =
  | "loading"
  | "ready" // mobile: "Open Bhutan NDI" button · web: QR code
  | "opening" // mobile: launching the wallet deep link
  | "still-opening" // mobile: wallet didn't open after ~4s
  | "qr" // mobile: "Use a QR code instead"
  | "scanned" // the wallet connected; approve in the wallet (DL-016)
  | "waiting" // deep link tapped: the wallet returns the user (DL-007)
  | "returning" // completed (cross-device): redirect to returnUrl now (§5.6)
  | "returned" // completed after the deep link: manual "Return to …" only (DL-007)
  | "declined" // the citizen chose Decline: "Nothing was shared" (Figma 11)
  | "failed" // not completed for another reason; link back to returnUrl (§5.6)
  | "expired" // deadline passed / platform says expired: "Start again at …" (DL-013)
  | "timed-out" // expired while scanned: "You did not approve in time" (DL-016)
  | "not-found" // unknown or already-expired link: generic message, no link (DL-013)
  | "gone" // the request vanished mid-flow (status 404): "no longer available" + way back (Figma 17)
  | "reconnecting"; // polling errors; keep the page open

const PENDING_VIEWS: View[] = ["ready", "opening", "still-opening", "qr"];
const TERMINAL: View[] = ["returning", "returned", "declined", "failed", "expired", "timed-out", "not-found", "gone"];

export const isTerminal = (v: View) => TERMINAL.includes(v);

export interface FlowState {
  view: View;
  session?: PublicSession;
  /** The user tapped "Open Bhutan NDI": never redirect on our own from here (DL-007). */
  tappedDeepLink: boolean;
  /** Whether a `scanned` status was seen, to tell "expired" from "did not approve in time". */
  wasScanned: boolean;
  /** View to go back to once polling recovers. */
  resumeView?: View;
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
  | { type: "connection-restored" };

export const initialFlow: FlowState = { view: "loading", tappedDeepLink: false, wasScanned: false };

function expiredView(state: FlowState): View {
  return state.wasScanned || state.view === "scanned" ? "timed-out" : "expired";
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  // Final screens never change again — e.g. a late status can't undo "returning".
  if (isTerminal(state.view) && action.type !== "connection-restored") return state;

  switch (action.type) {
    case "loaded":
      return {
        ...state,
        view: Date.now() >= action.request.expiresAt ? "expired" : "ready",
        session: { ...action.request, hostedId: action.hostedId, status: "pending" },
      };

    case "not-found":
      return { ...state, view: "not-found" };

    // The status check stopped finding a loaded request. After the deep link the
    // service has usually used the code already, so show "All done here" (Figma 7).
    case "gone":
      return { ...state, view: state.tappedDeepLink ? "returned" : "gone", resumeView: undefined };

    case "status": {
      if (!state.session) return state;
      const { status, returnUrl } = action.response;
      const session = { ...state.session, status, returnUrl: returnUrl ?? state.session.returnUrl };
      const base = state.view === "reconnecting" ? (state.resumeView ?? "ready") : state.view;
      const next = { ...state, session, resumeView: undefined };

      switch (status) {
        case "pending":
          return { ...next, view: base };
        case "scanned":
          // After the deep link the user is already in the wallet; keep "waiting".
          if (state.tappedDeepLink) return { ...next, view: "waiting", wasScanned: true };
          return { ...next, view: "scanned", wasScanned: true };
        case "completed":
          return { ...next, view: state.tappedDeepLink ? "returned" : "returning" };
        case "declined":
          return { ...next, view: "declined" };
        case "failed":
          return { ...next, view: "failed" };
        case "expired":
          return { ...next, view: expiredView({ ...state, view: base }) };
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
      return state.view === "reconnecting" ? state : { ...state, view: "reconnecting", resumeView: state.view };
    case "connection-restored":
      return state.view === "reconnecting" ? { ...state, view: state.resumeView ?? "ready", resumeView: undefined } : state;
  }
}
