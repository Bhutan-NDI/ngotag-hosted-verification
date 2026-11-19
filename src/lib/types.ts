/**
 * Status reported by the platform's `GET /verification/hosted/:hostedId/status` (HVP-SD §5.3).
 * `scanned` is optional: without it the page goes from `pending` straight to the outcome (DL-016).
 * `declined` is optional too (Figma 11): HVP-SD §5.3 has one `failed` value today; without
 * `declined` a decline shows as "We could not complete the check".
 */
export type HostedStatus = "pending" | "scanned" | "completed" | "declined" | "failed" | "expired";

/** What `GET /verification/hosted/:hostedId` returns. It never carries the response_code (DL-013). */
export interface HostedRequest {
  /** Host of the relying party's allowlisted redirectUri, shown as "You'll return to …" (DL-009). */
  returnHost: string;
  /** The relying party's redirectUri without the code; "Start again" goes here with error=expired (DL-013). */
  redirectUri: string;
  /** Bare DIDComm invitation: the only thing the QR code encodes (DL-004). */
  proofRequestURL: string;
  /** Deep link for the "Open Bhutan NDI" button (same device). */
  deepLinkURL?: string;
  /** The request's single deadline, shared with the wallet (DL-017), as epoch ms. */
  expiresAt: number;
  /** The request's total lifetime, if the platform sends it (`expiresInSeconds`); shown on the expired screen. */
  validForSeconds?: number;
}

/** What `GET /verification/hosted/:hostedId/status` returns. */
export interface HostedStatusResponse {
  status: HostedStatus;
  /** redirectUri?response_code=…; only present on `completed`, `declined` or `failed` (HVP-SD §5.3). */
  returnUrl?: string;
}

/** The page's view of a request: what it loaded once, plus the latest polled status. */
export interface PublicSession extends HostedRequest {
  hostedId: string;
  status: HostedStatus;
  returnUrl?: string;
}

export type DeviceMode = "mobile" | "web";
