"use client";

import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import type { View } from "@/lib/flow";
import { Fmt, useI18n } from "@/lib/i18n/client";
import { reasonUrl, returnHref } from "@/lib/platform";
import type { DeviceMode, PublicSession, ReturnReason } from "@/lib/types";
import {
  Asset,
  BrandName,
  cx,
  Divider,
  DoneIcon,
  LanguageToggle,
  MobileFooter,
  NdiMark,
  PrimaryButton,
  PrimaryLink,
  QrToggle,
  ScanSteps,
  Spinner,
  StatusIcon,
  WebFooter,
} from "./ui";

export interface ViewActions {
  onOpenWallet?: () => void;
  onShowQr?: () => void;
  onHideQr?: () => void;
}

export interface StateViewProps extends ViewActions {
  view: View;
  mode: DeviceMode;
  session?: PublicSession;
}

/* ------------------------------------------------------------------------ */
/* Layout                                                                    */
/* ------------------------------------------------------------------------ */

const cardBase = "relative w-full min-w-0 rounded-3xl bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.06)]";

/**
 * Card for the Ready family of screens, with the language toggle top-right.
 * Phone: 358px wide in a 390px frame (Figma 3). Desktop: 586px, content 386px (Figma 3w).
 */
function ConnectCard({ mode, children }: { mode: DeviceMode; children: ReactNode }) {
  const web = mode === "web";
  return (
    <section
      className={cx(
        cardBase,
        web ? "max-w-[586px] px-5 pb-10 pt-12 sm:px-[100px] sm:pt-10" : "max-w-[420px] px-5 pb-6 pt-7",
      )}
    >
      <LanguageToggle className="absolute right-3 top-3" />
      <div className={cx("animate-ndi-fade mx-auto flex flex-col items-center", web ? "max-w-[386px] gap-10" : "gap-4")}>
        {children}
      </div>
    </section>
  );
}

/** "Continue with Bhutan NDI Wallet" / "Scan with …" with an optional return line (DL-009). */
function TitleStack({ title, session, showReturn }: { title: string; session?: PublicSession; showReturn: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="text-[19px] font-semibold leading-tight text-ink">
        <Fmt text={title} values={{ brand: <BrandName /> }} />
      </h1>
      {showReturn && session && (
        <p className="text-[13px] leading-[18px] text-muted">
          <Fmt text={t.returnLine} values={{ host: <span className="font-semibold">{session.returnHost}</span> }} />
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* QR frame                                                                  */
/* ------------------------------------------------------------------------ */

/** Round QR badge: a 192px PNG export of NDI's QR logo (the source artwork is not in this repo). */
const QR_LOGO = "/qr-logo.png";
const QR_SIZE = 162;

/**
 * Mint-bordered frame (Figma: 203×197, 3px, radius 20). Holds the QR code, or —
 * once the wallet has scanned — the "Scanned" status in its place, so the page
 * layout never moves and a used code can't be scanned again (DL-016).
 */
function QrFrame({ session, scanned }: { session?: PublicSession; scanned: boolean }) {
  const { t } = useI18n();
  const value = session?.proofRequestURL;
  return (
    <div className="flex h-[197px] w-[203px] shrink-0 flex-col items-center justify-center gap-3 rounded-[20px] border-3 border-mint p-4">
      {scanned ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
          <Spinner />
          <div className="flex flex-col items-center gap-[5px] text-center">
            <p className="text-[19px] font-semibold text-ink">{t.scanned}</p>
            <p className="text-sm leading-5 text-muted">{t.scannedBody}</p>
          </div>
        </div>
      ) : value ? (
        // The QR code carries the bare invitation only, never the deep link (DL-004).
        // Level H tolerates ~30% damage, so the centre badge stays scannable.
        <QRCodeSVG
          value={value}
          size={QR_SIZE}
          level="H"
          fgColor="#000000"
          title={t.qrTitle}
          className="shrink-0"
          imageSettings={{ src: QR_LOGO, width: 40, height: 40, excavate: false }}
        />
      ) : (
        <Spinner />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Ready screens                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Phone (Figma 3–5, 8, 9): "Continue" opens the wallet; the QR code expands in
 * place. Opening/still-opening/scanned only change the button and title stack.
 */
function MobileConnect({ view, session, onOpenWallet, onShowQr, onHideQr }: StateViewProps) {
  const { t } = useI18n();
  const opening = view === "opening";
  const stillOpening = view === "still-opening";
  const scanned = view === "scanned";
  const qrOpen = view === "qr" || scanned;
  // Figma 3, 4, 8: the return line shows until the wallet has scanned (hidden in Figma 9).
  const showReturn = !scanned;

  return (
    <ConnectCard mode="mobile">
      <NdiMark />
      <TitleStack title={t.continueTitle} session={session} showReturn={showReturn} />

      {stillOpening && (
        <p className="text-center text-sm text-label" role="status">
          {t.walletDidNotOpen}
        </p>
      )}

      {opening ? (
        <PrimaryButton dim="loading" disabled aria-live="polite">
          <Spinner size={20} />
          {t.opening}
        </PrimaryButton>
      ) : scanned ? (
        // Native disabled: drops out of the tab order; the "Scanned" status says why (Figma 9).
        <PrimaryButton dim="disabled" disabled>
          {t.continue}
          <Asset src="arrow-right.svg" width={20} height={20} />
        </PrimaryButton>
      ) : (
        <PrimaryButton onClick={onOpenWallet} disabled={!session?.deepLinkURL}>
          {stillOpening ? t.tryAgain : t.continue}
          <Asset src={stillOpening ? "rotate-cw.svg" : "arrow-right.svg"} width={20} height={20} />
        </PrimaryButton>
      )}

      {qrOpen ? (
        <div className="animate-ndi-fade flex flex-col items-center gap-4">
          <QrToggle expanded disabled={scanned} onClick={onHideQr} />
          <QrFrame session={session} scanned={scanned} />
          <ScanSteps />
        </div>
      ) : (
        <QrToggle expanded={false} onClick={onShowQr} />
      )}

      <Divider className={qrOpen ? "mt-2" : undefined} />
      <MobileFooter />
    </ConnectCard>
  );
}

/** Desktop (Figma 3w, 9w): QR code first; "Scanned" replaces it in place. */
function WebScan({ view, session, onOpenWallet }: StateViewProps) {
  const { t } = useI18n();
  const scanned = view === "scanned";
  return (
    <ConnectCard mode="web">
      <TitleStack title={t.scanTitle} session={session} showReturn={!scanned} />
      <div className="flex flex-col items-center gap-3">
        <QrFrame session={session} scanned={scanned} />
        {/* The other path, so a wrong device guess is never a dead end (HVP-SD §5.6). */}
        {session?.deepLinkURL && <OpenOnThisDevice disabled={scanned} onClick={onOpenWallet} />}
      </div>
      <ScanSteps size="lg" />
      <WebFooter />
    </ConnectCard>
  );
}

/**
 * "Using this phone or tablet? / Open Bhutan NDI" under the QR frame (Figma 3w). Greyed out and
 * disabled once the wallet has scanned, like the phone's Continue button (Figma 9w).
 */
function OpenOnThisDevice({ disabled, onClick }: { disabled: boolean; onClick?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center text-center text-[15px] leading-[22px]">
      <p className={disabled ? "text-disabled" : "text-muted"}>{t.usingThisDevice}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cx(
          "rounded font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          disabled ? "cursor-not-allowed text-disabled" : "text-brand underline-offset-4 hover:underline",
        )}
      >
        {t.openNdi}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Status screens                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Centred status card (Figma 2, 6, 7, 10–17). No language toggle and no footer.
 * Phone: 358px; desktop: 480px with a 400px column.
 */
export function Status({
  mode,
  icon,
  title,
  body,
  children,
}: {
  mode: DeviceMode;
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
}) {
  const web = mode === "web";
  return (
    <section className={cx(cardBase, web ? "max-w-[480px] px-5 pb-8 pt-10 sm:px-10" : "max-w-[420px] px-5 pb-7 pt-9")}>
      <div className="animate-ndi-fade flex flex-col items-center gap-5 text-center" role="status" aria-live="polite">
        {icon}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-semibold leading-tight text-ink">{title}</h1>
          {body && <p className="max-w-[400px] text-sm leading-[21px] text-muted">{body}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/**
 * Every way back is a button the citizen presses (DL-019): the coded returnUrl while it is still
 * valid, otherwise redirectUri with `error=<reason>`. Never the bare redirectUri (DL-013).
 */
function BackButton({ session, reason, label }: { session?: PublicSession; reason: ReturnReason; label?: string }) {
  const { t } = useI18n();
  if (!session) return null;
  return (
    <PrimaryLink href={returnHref(session, reason)}>
      <Fmt text={label ?? t.returnTo} values={{ host: session.returnHost }} />
    </PrimaryLink>
  );
}

/**
 * "Cancel and return to <host>" while waiting after the deep link: `error=cancelled` (DL-019(2)).
 * Not on the Ready, QR or Scanned screens, which have no cancel link in Figma.
 */
function CancelLink({ session }: { session?: PublicSession }) {
  const { t } = useI18n();
  if (!session) return null;
  return (
    <a
      href={reasonUrl(session.redirectUri, "cancelled")}
      className="rounded text-[13px] font-medium text-muted underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Fmt text={t.cancelReturn} values={{ host: session.returnHost }} />
    </a>
  );
}

/* ------------------------------------------------------------------------ */
/* Router                                                                    */
/* ------------------------------------------------------------------------ */

export function StateView(props: StateViewProps) {
  const { t } = useI18n();
  const { view, mode, session } = props;
  const host = session?.returnHost ?? "";

  switch (view) {
    case "ready":
    case "opening":
    case "still-opening":
    case "qr":
      return mode === "web" ? <WebScan {...props} view="ready" /> : <MobileConnect {...props} />;

    case "scanned":
      return mode === "web" ? <WebScan {...props} /> : <MobileConnect {...props} />;

    // First paint: NDI branding only, no service name (Figma 2).
    case "loading":
      return <Status mode={mode} icon={<Spinner />} title={t.loadingTitle} body={t.loadingBody} />;

    // Deep link tapped: the wallet returns the citizen itself (DL-007, E7); the page only waits.
    case "waiting":
      return (
        <Status
          mode={mode}
          icon={<StatusIcon name="smartphone" />}
          title={t.waitingTitle}
          body={<Fmt text={t.waitingBody} values={{ host }} />}
        >
          <CancelLink session={session} />
        </Status>
      );

    // Done here (Figma 7): completed after the deep link (manual Return in case the wallet's return
    // did not arrive, DL-007), another tab returned, or no valid code is left (error=unavailable).
    case "returned":
      return (
        <Status
          mode={mode}
          icon={<StatusIcon name="new-tab" />}
          title={t.returnedTitle}
          body={<Fmt text={t.returnedBody} values={{ host }} />}
        >
          <BackButton session={session} reason="unavailable" />
          <p className="-mt-2 text-[13px] leading-[18px] text-muted">{t.closeTab}</p>
        </Status>
      );

    // Completed (cross-device): leave within seconds (§5.6, Figma 10).
    case "returning":
      return (
        <Status
          mode={mode}
          icon={<DoneIcon />}
          title={t.doneTitle}
          body={<Fmt text={t.returningBody} values={{ host: <span className="font-medium">{host}</span> }} />}
        />
      );

    case "declined":
      return (
        <Status
          mode={mode}
          icon={<StatusIcon name="circle-x" />}
          title={t.declinedTitle}
          body={<Fmt text={t.declinedBody} values={{ host }} />}
        >
          {/* `failed` also lands here (flow.ts); without a code, tell the relying party what the platform said. */}
          <BackButton session={session} reason={session?.status === "failed" ? "failed" : "declined"} />
        </Status>
      );

    case "failed":
      return (
        <Status
          mode={mode}
          icon={<StatusIcon name="triangle-alert" />}
          title={t.failedTitle}
          body={<Fmt text={t.failedBody} values={{ host }} />}
        >
          <BackButton session={session} reason="failed" />
        </Status>
      );

    case "expired":
      return (
        <Status
          mode={mode}
          icon={<StatusIcon name="hourglass" />}
          title={t.expiredTitle}
          body={<Fmt text={t.expiredBody} values={{ host }} />}
        >
          {/* A button only: the page never sends the citizen back on its own (DL-013). */}
          <BackButton session={session} reason="expired" label={t.startAgainAt} />
        </Status>
      );

    // Scanned but unanswered until the deadline (DL-016, Figma 14).
    case "timed-out":
      return (
        <Status
          mode={mode}
          icon={<StatusIcon name="clock" />}
          title={t.timedOutTitle}
          body={<Fmt text={t.timedOutBody} values={{ host }} />}
        >
          <BackButton session={session} reason="expired" label={t.startAgainAt} />
        </Status>
      );

    // Unknown or already-expired link: no way back — the page never learned the host (DL-013, Figma 15).
    case "not-found":
      return <Status mode={mode} icon={<StatusIcon name="link-off" />} title={t.notFoundTitle} body={t.notFoundBody} />;

    // Loaded, then the status check stopped finding it (Figma 17).
    case "gone":
      return (
        <Status
          mode={mode}
          icon={<StatusIcon name="link-off" />}
          title={t.notFoundTitle}
          body={<Fmt text={t.goneBody} values={{ host }} />}
        >
          {/* Lost mid-flow: no code to hand over, so the reason is `unavailable` (DL-019). */}
          <BackButton session={session} reason="unavailable" />
        </Status>
      );

    // Polling errors: keeps retrying on its own, so no button (Figma 16).
    case "reconnecting":
      return <Status mode={mode} icon={<Spinner />} title={t.reconnectingTitle} body={t.reconnectingBody} />;
  }
}

/** Page frame: the card on the canvas, 16px side gutters, 32px from the top (Figma). */
export function Frame({ children }: { children: ReactNode; mode?: DeviceMode }) {
  return <main className="flex min-h-dvh w-full items-start justify-center px-4 pb-8 pt-8 sm:pt-16">{children}</main>;
}
