import type { HostedRequest, HostedStatusResponse, PublicSession } from "./types";

/** Every screen of the hosted page (UX-HVP-01, constrained by HVP-SD §5.6). */
export type View =
  | "loading"
  | "ready" // mobile: "Open Bhutan NDI" button · web: QR code
  | "opening" // mobile: launching the wallet deep link
  | "still-opening" // mobile: wallet didn't open after ~4s
  | "qr" // mobile: "Use a QR code instead"
  | "scanned" // the wallet connected; approve in the wallet (DL-016)
  | "waiting" // deep link tapped: the wallet returns the citizen itself (DL-007); Cancel only
  | "returning" // completed in QR mode: redirect to returnUrl now (§5.6) — the only automatic return
  | "returned" // done here: after the deep link (manual Return, DL-007), or no code left to hand over
  | "declined" // the citizen chose Decline: "Nothing was shared" (Figma 11)
  | "failed" // not completed for another reason; link back to returnUrl (§5.6)
  | "expired" // deadline passed / platform says expired: "Start again at …" (DL-013)
  | "timed-out" // expired while scanned: "You did not approve in time" (DL-016)
  | "not-found" // unknown or already-expired link: generic message, no link (DL-013)
  | "gone" // the request vanished mid-flow (status 404): "no longer available" + way back (Figma 17)
  | "reconnecting"; // polling errors; keep the page open

const PENDING_VIEWS: View[] = ["ready", "opening", "still-opening", "qr"];
const EXPIRED_VIEWS: View[] = ["expired", "timed-out"];

/** Stop offering returnUrl this long before returnUrlExpiresAt, so a click still lands in time (DL-021). */
export const CODE_MARGIN_MS = 5000;

const codeExpired = (returnUrlExpiresAt: number | undefined, now: number) =>
  returnUrlExpiresAt !== undefined && now >= returnUrlExpiresAt - CODE_MARGIN_MS;

export interface FlowState {
  view: View;
  session?: PublicSession;
  /**
   * The deep link reached the wallet (the page lost focus after the tap): the wallet returns the
   * citizen, so never redirect on our own (DL-007). A tap that opened nothing doesn't count, and
   * "Use QR code instead" clears it, so a QR completion still returns automatically (DL-019(1)).
   */
  tappedDeepLink: boolean;
  /** Whether a `scanned` status was seen, to tell "expired" from "did not approve in time". */
  wasScanned: boolean;
  /** View to go back to once polling recovers. */
  resumeView?: View;
  /** Final answer from the platform: stop polling. The page's own deadline does not settle (grace period). */
  settled: boolean;
}

/** `now` is server time when the platform sends it (DL-021), else the device clock. */
export type FlowAction =
  | { type: "loaded"; hostedId: string; request: HostedRequest; now: number }
  | { type: "not-found" }
  | { type: "gone" }
  | { type: "status"; response: HostedStatusResponse; now: number }
  /** returnUrl is about to stop being exchangeable (returnUrlExpiresAt − CODE_MARGIN_MS). */
  | { type: "code-expired" }
  | { type: "deadline" }
  | { type: "tap-deep-link" }
  /** ~4 s after the tap with no sign of the wallet. `web`: back to the QR code, which stays on screen. */
  | { type: "open-timeout"; web?: boolean }
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
  // Another tab is returning with the code: stand down, and drop its now-used returnUrl.
  if (action.type === "returned-elsewhere" && state.view === "returning") {
    const session = state.session && { ...state.session, returnUrl: undefined };
    return { ...state, session, view: "returned", resumeView: undefined, settled: true };
  }
  // The code is about to lapse: buttons fall back to their reason link; "returning" stands down.
  if (action.type === "code-expired") {
    if (!state.session?.returnUrl) return state;
    const session = { ...state.session, returnUrl: undefined };
    return state.view === "returning" ? { ...state, session, view: "returned", settled: true } : { ...state, session };
  }
  // Final answers never change again — e.g. a late status can't undo "returning".
  if (state.settled) return state;

  switch (action.type) {
    case "loaded":
      return {
        ...state,
        view: action.now >= action.request.expiresAt ? "expired" : "ready",
        session: { ...action.request, hostedId: action.hostedId, status: "pending" },
      };

    case "not-found":
      return { ...state, view: "not-found", settled: true };

    // The status check stopped finding a loaded request. After the deep link the
    // service has usually used the code already, so show "All done here" (Figma 7).
    case "gone":
      // Already past the deadline: the request simply expired; keep that screen.
      if (EXPIRED_VIEWS.includes(state.view)) return { ...state, resumeView: undefined, settled: true };
      return { ...state, view: state.tappedDeepLink ? "returned" : "gone", resumeView: undefined, settled: true };

    case "status": {
      if (!state.session) return state;
      const { status } = action.response;
      const returnUrlExpiresAt = action.response.returnUrlExpiresAt ?? state.session.returnUrlExpiresAt;
      const freshUrl = action.response.returnUrl ?? state.session.returnUrl;
      const returnUrl = freshUrl && !codeExpired(returnUrlExpiresAt, action.now) ? freshUrl : undefined;
      const session = { ...state.session, status, returnUrl, returnUrlExpiresAt };
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
          // After the deep link the wallet opens returnUrl itself (DL-007, E7): never redirect here,
          // only offer a manual Return in case the wallet's return did not arrive.
          if (state.tappedDeepLink) return { ...final, view: "returned" };
          // QR mode: return at once with the code; with no valid code left, nothing to hand over.
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
      return { ...state, view: "opening" };
    case "open-timeout":
      if (state.view !== "opening") return state;
      return { ...state, view: action.web ? "ready" : "still-opening" };
    case "page-hidden":
      // The wallet took focus: when the user comes back, show "waiting".
      return state.view === "opening" || state.view === "still-opening"
        ? { ...state, view: "waiting", tappedDeepLink: true }
        : state;

    case "show-qr":
      return PENDING_VIEWS.includes(state.view) ? { ...state, view: "qr", tappedDeepLink: false } : state;
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
