"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type ReactNode } from "react";
import type { View } from "@/lib/flow";
import { Fmt, useI18n } from "@/lib/i18n/client";
import type { DeviceMode, PublicSession } from "@/lib/types";
import {
  BrandName,
  cx,
  Divider,
  GetTheApp,
  Icon,
  LanguageToggle,
  NdiMark,
  PrimaryButton,
  PrimaryLink,
  Spinner,
  StatusBadge,
  Steps,
  SupportFooter,
  TextButton,
  TextLink,
  WatchGuideButton,
} from "./ui";

export interface ViewActions {
  onContinue?: () => void;
  onShowQr?: () => void;
  onHideQr?: () => void;
  onRestart?: () => void;
}

export interface StateViewProps extends ViewActions {
  view: View;
  mode: DeviceMode;
  session?: PublicSession;
}

/* ------------------------------------------------------------------------ */
/* Layout                                                                    */
/* ------------------------------------------------------------------------ */

export function Card({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { toggleEnabled } = useI18n();
  return (
    <section
      className={cx(
        "w-full rounded-3xl border border-line bg-surface px-6 pb-8 shadow-[0_1px_2px_rgba(16,34,29,.04),0_8px_24px_-12px_rgba(16,34,29,.12)] sm:px-8",
        // Without the toggle row, give the content the same top breathing room.
        toggleEnabled ? "pt-4" : "pt-8",
        wide ? "max-w-[480px]" : "max-w-[420px]",
      )}
    >
      {toggleEnabled && (
        <header className="-mr-2 mb-2 flex justify-end sm:-mr-4">
          <LanguageToggle />
        </header>
      )}
      <div className="animate-ndi-fade">{children}</div>
    </section>
  );
}

function Countdown({ until, label }: { until?: number; label: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!until || now === null) return null;
  const left = Math.max(0, Math.round((until - now) / 1000));
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <p className="text-xs text-subtle">
      {label} <span className="font-medium tabular-nums text-muted">{`${mm}:${ss}`}</span>
    </p>
  );
}

/* ------------------------------------------------------------------------ */
/* QR / scanned panels                                                       */
/* ------------------------------------------------------------------------ */

/**
 * Round QR badge. Rendered from public/QRlogo.svg (875 KB, embedded bitmap)
 * to a 192px PNG (~20 KB) — re-export it if the SVG changes.
 */
const QR_LOGO = "/qr-logo.png";

function QrPanel({ session, size = 208 }: { session?: PublicSession; size?: number }) {
  // Badge ≈ 24% of the code's width; it carries its own white ring.
  const logoSize = Math.round(size * 0.24);
  const { t } = useI18n();
  const value = session?.proofRequestURL;
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Mint-bordered frame with generous quiet zone (Figma). */}
      <div
        className="grid place-items-center rounded-[22px] border-2 border-mint bg-white"
        style={{ width: size + 44, height: size + 44 }}
      >
        {value ? (
          // Level H tolerates ~30% damage, so the centre badge stays scannable;
          // `excavate` clears the modules underneath it.
          <QRCodeSVG
            value={value}
            size={size}
            level="H"
            fgColor="#000000"
            title={t.qrTitle}
            imageSettings={{
              src: QR_LOGO,
              width: logoSize,
              height: logoSize,
              excavate: false,
            }}
          />
        ) : (
          <Spinner className="size-6 text-subtle" />
        )}
      </div>
      <Countdown until={session?.expiresAt} label={t.codeExpiresIn} />
    </div>
  );
}

function ScannedPanel({ session }: { session?: PublicSession }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-mint bg-brand-soft/60 px-6 py-8 text-center"
        role="status"
      >
        <span className="grid size-11 place-items-center rounded-full bg-mint text-white">
          <Icon.Check className="size-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-ink">{t.scanned}</p>
          <p className="mt-1 text-sm text-muted">
            <Fmt text={t.scannedBody} values={{ brand: <BrandName /> }} />
          </p>
        </div>
        <p className="inline-flex items-center gap-2 text-xs text-muted">
          <Spinner className="size-3.5" /> {t.waitingApproval}
        </p>
      </div>
      <Countdown until={session?.approvalDeadline} label={t.approveWithin} />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Main screens                                                              */
/* ------------------------------------------------------------------------ */

/** "You'll return to service.gov.bt" under the title (Figma). */
function Requester({ session }: { session?: PublicSession }) {
  const { t } = useI18n();
  if (!session) return null;
  return (
    <p className="mt-1.5 text-sm text-muted">
      <Fmt text={t.returnLine} values={{ host: <span className="font-semibold text-ink">{session.partnerHost}</span> }} />
    </p>
  );
}

/** Mobile: Continue (deep link) — covers ready, opening, still-opening, qr, scanned. */
function MobileConnect({ view, session, onContinue, onShowQr, onHideQr }: StateViewProps) {
  const { t } = useI18n();
  const opening = view === "opening";
  const stillOpening = view === "still-opening";
  const scanned = view === "scanned";
  const showQr = view === "qr";

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <NdiMark />
        <h1 className="mt-5 text-xl font-semibold leading-tight tracking-tight">
          <Fmt text={t.continueTitle} values={{ brand: <BrandName /> }} />
        </h1>
        <Requester session={session} />
      </div>

      <div className="mt-6 space-y-3">
        {stillOpening && (
          <div className="rounded-xl bg-warn-soft px-4 py-3 text-left text-sm text-ink" role="status">
            <p className="font-medium">{t.stillOpeningTitle}</p>
            <p className="mt-0.5 text-muted">{t.stillOpeningBody}</p>
          </div>
        )}

        <PrimaryButton onClick={onContinue} disabled={opening || scanned || !session?.deepLinkURL}>
          {opening ? (
            <>
              <Spinner className="size-4" /> {t.opening}
            </>
          ) : stillOpening ? (
            <>
              {t.tryAgain} <Icon.Retry className="size-4" />
            </>
          ) : (
            <>
              {t.continue} <Icon.ArrowRight className="size-4" />
            </>
          )}
        </PrimaryButton>

        {!scanned && (
          <div className="text-center">
            {showQr ? (
              <TextButton onClick={onHideQr} aria-expanded="true" className="inline-flex items-center gap-1">
                {t.hideQr} <Icon.ChevronDown className="size-4 rotate-180" />
              </TextButton>
            ) : (
              <TextButton onClick={onShowQr} aria-expanded="false" className="inline-flex items-center gap-1">
                {t.useQr} <Icon.ChevronDown className="size-4" />
              </TextButton>
            )}
          </div>
        )}
      </div>

      {(showQr || scanned) && (
        <div className="mt-6 animate-ndi-fade">
          {scanned ? (
            <ScannedPanel session={session} />
          ) : (
            <>
              <QrPanel session={session} size={184} />
              <div className="mt-5">
                <Steps
                  items={[
                    <Fmt key="1" text={t.stepOpenOnOtherPhone} values={{ brand: <BrandName /> }} />,
                    t.stepScanThisCode,
                  ]}
                />
              </div>
            </>
          )}
        </div>
      )}

      <Divider />
      <GetTheApp />
      <SupportFooter />
    </Card>
  );
}

/** Web: QR — covers ready and scanned. */
function WebScan({ view, session }: StateViewProps) {
  const { t } = useI18n();
  const scanned = view === "scanned";
  return (
    <Card wide>
      <div className="flex flex-col items-center text-center">
        <h1 className="text-xl font-semibold leading-tight tracking-tight">
          <Fmt text={t.scanTitle} values={{ brand: <BrandName /> }} />
        </h1>
        <Requester session={session} />
      </div>

      <div className="mt-6">{scanned ? <ScannedPanel session={session} /> : <QrPanel session={session} />}</div>

      <div className="mx-auto mt-6 max-w-[340px]">
        <Steps
          done={scanned ? 2 : 0}
          items={[
            <Fmt key="1" text={t.stepOpenOnPhone} values={{ brand: <BrandName /> }} />,
            <Fmt key="2" text={t.stepTapScan} values={{ scan: <Icon.Scan className="inline size-4 align-[-3px]" /> }} />,
            t.stepApprove,
          ]}
        />
      </div>

      <WatchGuideButton className="mt-6" />

      <Divider />
      <GetTheApp />
      <SupportFooter />
    </Card>
  );
}

/* ------------------------------------------------------------------------ */
/* Status screens                                                            */
/* ------------------------------------------------------------------------ */

export function Status({
  badge,
  title,
  body,
  children,
  footer,
}: {
  badge: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
        {badge}
        <h1 className="mt-5 text-xl font-semibold leading-tight tracking-tight">{title}</h1>
        {body && <p className="mt-2 max-w-[330px] text-sm leading-6 text-muted">{body}</p>}
      </div>
      {children && <div className="mt-6 flex flex-col items-center gap-3">{children}</div>}
      {footer}
    </Card>
  );
}

function returnHref(session?: PublicSession) {
  return session ? `/api/sessions/${encodeURIComponent(session.id)}/return` : undefined;
}

function ReturnButton({ session }: { session?: PublicSession }) {
  const { t } = useI18n();
  const href = returnHref(session);
  if (!href || !session) return null;
  return (
    <PrimaryLink href={href}>
      <Fmt text={t.returnTo} values={{ host: session.partnerHost }} />
    </PrimaryLink>
  );
}

function CancelLink({ session }: { session?: PublicSession }) {
  const { t } = useI18n();
  const href = returnHref(session);
  if (!href || !session) return null;
  return (
    <TextLink href={href}>
      <Fmt text={t.cancelReturn} values={{ host: session.partnerHost }} />
    </TextLink>
  );
}

function RestartActions({ session, onRestart }: { session?: PublicSession; onRestart?: () => void }) {
  const { t } = useI18n();
  if (!session?.canRestart) return <ReturnButton session={session} />;
  return (
    <>
      <PrimaryButton onClick={onRestart}>
        {t.startAgain} <Icon.Retry className="size-4" />
      </PrimaryButton>
      <CancelLink session={session} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Router                                                                    */
/* ------------------------------------------------------------------------ */

export function StateView(props: StateViewProps) {
  const { t } = useI18n();
  const { view, mode, session } = props;
  const host = session?.partnerHost ?? "";
  const partner = session?.partnerName ?? host;
  const brand = <BrandName />;

  switch (view) {
    case "ready":
    case "opening":
    case "still-opening":
    case "qr":
      return mode === "web" ? <WebScan {...props} view="ready" /> : <MobileConnect {...props} />;

    case "scanned":
      return mode === "web" ? <WebScan {...props} /> : <MobileConnect {...props} />;

    case "loading":
      return (
        <Status
          badge={
            <StatusBadge tone="neutral">
              <Spinner className="size-6" />
            </StatusBadge>
          }
          title={t.loadingTitle}
          body={t.loadingBody}
        />
      );

    case "waiting":
      return (
        <Status
          badge={<NdiMark />}
          title={<Fmt text={t.waitingTitle} values={{ brand }} />}
          body={<Fmt text={t.waitingBody} values={{ host }} />}
        >
          <p className="inline-flex items-center gap-2 text-xs text-muted">
            <Spinner className="size-3.5" /> {t.waitingResponse}
          </p>
          <PrimaryButton onClick={props.onContinue} disabled={!session?.deepLinkURL}>
            {t.openWallet} <Icon.ArrowRight className="size-4" />
          </PrimaryButton>
          <CancelLink session={session} />
        </Status>
      );

    case "returning":
      return (
        <Status
          badge={
            <StatusBadge tone="success">
              <Icon.Check className="size-7" />
            </StatusBadge>
          }
          title={t.doneTitle}
          body={<Fmt text={t.returningBody} values={{ host }} />}
        >
          <Spinner className="size-5 text-subtle" />
          {returnHref(session) && <TextLink href={returnHref(session)}>{t.notRedirected}</TextLink>}
        </Status>
      );

    case "done-elsewhere":
      return (
        <Status
          badge={
            <StatusBadge tone="success">
              <Icon.Check className="size-7" />
            </StatusBadge>
          }
          title={t.doneElsewhereTitle}
          body={t.doneElsewhereBody}
        >
          <ReturnButton session={session} />
        </Status>
      );

    case "declined":
      return (
        <Status
          badge={
            <StatusBadge tone="neutral">
              <Icon.X className="size-6" />
            </StatusBadge>
          }
          title={t.declinedTitle}
          body={<Fmt text={t.declinedBody} values={{ partner }} />}
        >
          <ReturnButton session={session} />
        </Status>
      );

    case "failed":
      return (
        <Status
          badge={
            <StatusBadge tone="danger">
              <Icon.Alert className="size-6" />
            </StatusBadge>
          }
          title={t.failedTitle}
          body={t.failedBody}
          footer={<SupportFooter />}
        >
          <ReturnButton session={session} />
        </Status>
      );

    case "expired":
      return (
        <Status
          badge={
            <StatusBadge tone="warn">
              <Icon.Hourglass className="size-6" />
            </StatusBadge>
          }
          title={t.expiredTitle}
          body={t.expiredBody}
        >
          <RestartActions session={session} onRestart={props.onRestart} />
        </Status>
      );

    case "timed-out":
      return (
        <Status
          badge={
            <StatusBadge tone="warn">
              <Icon.Clock className="size-6" />
            </StatusBadge>
          }
          title={t.timedOutTitle}
          body={t.timedOutBody}
        >
          <RestartActions session={session} onRestart={props.onRestart} />
        </Status>
      );

    case "not-found":
      return (
        <Status
          badge={
            <StatusBadge tone="neutral">
              <Icon.LinkOff className="size-6" />
            </StatusBadge>
          }
          title={t.notFoundTitle}
          body={t.notFoundBody}
          footer={<SupportFooter />}
        />
      );

    case "reconnecting":
      return (
        <Status
          badge={
            <StatusBadge tone="warn">
              <Icon.WifiOff className="size-6" />
            </StatusBadge>
          }
          title={t.reconnectingTitle}
          body={t.reconnectingBody}
        >
          <Spinner className="size-5 text-subtle" />
        </Status>
      );

    case "unavailable":
      return (
        <Status
          badge={
            <StatusBadge tone="neutral">
              <Icon.Ban className="size-6" />
            </StatusBadge>
          }
          title={t.notFoundTitle}
          body={<Fmt text={t.unavailableBody} values={{ host }} />}
        >
          <ReturnButton session={session} />
        </Status>
      );
  }
}

/** Page frame: centred card on the canvas. */
export function Frame({ children, mode }: { children: ReactNode; mode: DeviceMode }) {
  return (
    <main
      className={cx(
        "flex min-h-dvh w-full justify-center px-4",
        mode === "web" ? "items-center py-10" : "items-start py-4 sm:items-center sm:py-10",
      )}
    >
      {children}
    </main>
  );
}
