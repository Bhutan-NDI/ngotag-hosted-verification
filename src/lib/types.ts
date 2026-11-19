/** Server-side lifecycle of a verification session. */
export type SessionStatus =
  | "created" // session exists, no proof request yet
  | "pending" // proof request ready, waiting for the wallet
  | "scanned" // wallet picked up the request, waiting for approval
  | "verified" // proof validated
  | "declined" // user declined in the wallet
  | "failed" // proof could not be validated
  | "expired" // proof request not used before PROOF_TTL
  | "timed_out" // scanned but not approved before APPROVAL_TIMEOUT
  | "cancelled" // user/partner cancelled, or session superseded
  | "completed"; // result handed back to the partner (redirected)

/** Safe-to-expose view of a session, sent to the browser. */
export interface PublicSession {
  id: string;
  status: SessionStatus;
  partnerName: string;
  /** Hostname of the partner, shown as "Return to service.gov.bt". */
  partnerHost: string;
  proofRequestURL?: string;
  deepLinkURL?: string;
  /** Epoch ms when the current proof request expires (pending only). */
  expiresAt?: number;
  /** Epoch ms when approval times out (scanned only). */
  approvalDeadline?: number;
  /** Final outcome once status is "completed". */
  outcome?: SessionStatus;
  /** Whether "Start again" is still possible. */
  canRestart: boolean;
}

export type DeviceMode = "mobile" | "web";
