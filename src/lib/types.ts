/**
 * Status reported by `GET /verification/hosted/:hostedId/status` (HVP-SD §5.3).
 * `scanned` (DL-016) and `declined` (DL-020) are optional; without them the page goes from
 * `pending` straight to the outcome, and a decline arrives as `failed`. Until the platform sends
 * `declined`, the page shows `failed` as the declined screen (src/lib/flow.ts).
 */
export type HostedStatus = "pending" | "scanned" | "completed" | "declined" | "failed" | "expired";

/** What `GET /verification/hosted/:hostedId` returns. It never carries the response_code (DL-013). */
export interface HostedRequest {
  /** Host of the relying party's allowlisted redirectUri, shown as "You'll return to …" (DL-009). */
  returnHost: string;
  /** The relying party's redirectUri without the code; every return without a code goes here with `error=<reason>` (DL-019). */
  redirectUri: string;
  /** Bare DIDComm invitation: the only thing the QR code encodes (DL-004). */
  proofRequestURL: string;
  /**
   * Deep link for the "Open Bhutan NDI" button (same device). It carries `returnUrl`, so after
   * the tap the wallet returns the citizen itself and the page never redirects (DL-007, E7).
   */
  deepLinkURL?: string;
  /** The request's single deadline, shared with the wallet (DL-017), as epoch ms. */
  expiresAt: number;
  /** The platform's clock when it answered, epoch ms (DL-021). Optional: older platforms omit it. */
  serverTime?: number;
}

/** What `GET /verification/hosted/:hostedId/status` returns. */
export interface HostedStatusResponse {
  status: HostedStatus;
  /** redirectUri?response_code=…; only present on `completed`, `declined` or `failed` (HVP-SD §5.3). */
  returnUrl?: string;
  /** When the response_code in returnUrl stops being exchangeable, epoch ms (DL-021). Optional. */
  returnUrlExpiresAt?: number;
  /** The platform's clock when it answered, epoch ms (DL-021). Optional. */
  serverTime?: number;
}

/** Why the citizen returns without a code: sent as `redirectUri?error=<reason>` (DL-019). */
export type ReturnReason = "expired" | "declined" | "failed" | "unavailable" | "cancelled";

/** The page's view of a request: what it loaded once, plus the latest polled status. */
export interface PublicSession extends HostedRequest {
  hostedId: string;
  status: HostedStatus;
  returnUrl?: string;
  returnUrlExpiresAt?: number;
}

export type DeviceMode = "mobile" | "web";
