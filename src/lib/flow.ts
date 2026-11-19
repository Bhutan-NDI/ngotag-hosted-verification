import type { PublicSession, SessionStatus } from "./types";

/** Every screen in the Figma flow. */
export type View =
  | "loading"
  | "ready" // mobile: Continue button · web: QR code
  | "opening" // mobile: launching the wallet deep link
  | "still-opening" // mobile: wallet didn't open after ~4s
  | "waiting" // mobile: user went to the wallet and came back
  | "qr" // mobile: "Use a QR code instead"
  | "scanned"
  | "returning"
  | "done-elsewhere" // finished in another tab
  | "declined"
  | "failed"
  | "expired"
  | "timed-out"
  | "not-found"
  | "reconnecting"
  | "unavailable"; // cancelled / completed mid-request

export const ALL_VIEWS: View[] = [
  "loading",
  "ready",
  "opening",
  "still-opening",
  "waiting",
  "qr",
  "scanned",
  "returning",
  "done-elsewhere",
  "declined",
  "failed",
  "expired",
  "timed-out",
  "not-found",
  "reconnecting",
  "unavailable",
];

/** Views where we are still waiting on the server and need a live stream. */
const LIVE: View[] = ["loading", "ready", "opening", "still-opening", "waiting", "qr", "scanned", "reconnecting"];
const PENDING_VIEWS: View[] = ["ready", "opening", "still-opening", "waiting", "qr"];

export const isLive = (v: View) => LIVE.includes(v);

export interface FlowState {
  view: View;
  session?: PublicSession;
  /** View to go back to once the connection recovers. */
  resumeView?: View;
}

export type FlowAction =
  | { type: "server"; session: PublicSession }
  | { type: "gone" }
  | { type: "tap-continue" }
  | { type: "open-timeout" }
  | { type: "page-hidden" }
  | { type: "show-qr" }
  | { type: "hide-qr" }
  | { type: "connection-lost" }
  | { type: "connection-restored" }
  | { type: "done-elsewhere" }
  | { type: "restart" };

function viewForStatus(status: SessionStatus, current: View, outcome?: SessionStatus): View {
  switch (status) {
    case "created":
      return "loading";
    case "pending":
      return PENDING_VIEWS.includes(current) ? current : "ready";
    case "scanned":
      return "scanned";
    case "verified":
      return "returning";
    case "declined":
      return "declined";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    case "timed_out":
      return "timed-out";
    case "cancelled":
      return "unavailable";
    case "completed":
      if (current === "returning") return "returning";
      return outcome === "verified" ? "done-elsewhere" : "unavailable";
  }
}

export function initialFlow(session: PublicSession | null): FlowState {
  if (!session) return { view: "not-found" };
  return { view: viewForStatus(session.status, "loading", session.outcome), session };
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "server": {
      const base = state.view === "reconnecting" ? (state.resumeView ?? "ready") : state.view;
      // While a fresh proof is being created, ignore stale terminal snapshots.
      if (state.view === "loading" && (action.session.status === "expired" || action.session.status === "timed_out")) {
        return { ...state, session: action.session };
      }
      return {
        view: viewForStatus(action.session.status, base, action.session.outcome),
        session: action.session,
      };
    }
    case "gone":
      return { view: "not-found" };
    case "tap-continue":
      return state.view === "ready" || state.view === "still-opening" || state.view === "qr" || state.view === "waiting"
        ? { ...state, view: "opening" }
        : state;
    case "open-timeout":
      return state.view === "opening" ? { ...state, view: "still-opening" } : state;
    case "page-hidden":
      // The wallet app took focus — when the user comes back, show "waiting".
      return state.view === "opening" || state.view === "still-opening"
        ? { ...state, view: "waiting" }
        : state;
    case "show-qr":
      return PENDING_VIEWS.includes(state.view) ? { ...state, view: "qr" } : state;
    case "hide-qr":
      return state.view === "qr" ? { ...state, view: "ready" } : state;
    case "connection-lost":
      return isLive(state.view) && state.view !== "reconnecting"
        ? { ...state, view: "reconnecting", resumeView: state.view }
        : state;
    case "connection-restored":
      return state.view === "reconnecting"
        ? { ...state, view: state.resumeView ?? "ready", resumeView: undefined }
        : state;
    case "done-elsewhere":
      return state.view === "returning" ? state : { ...state, view: "done-elsewhere" };
    case "restart":
      return state.session?.canRestart ? { ...state, view: "loading" } : state;
  }
}
