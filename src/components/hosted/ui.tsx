"use client";

import Image from "next/image";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Fmt, useI18n } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/messages";

/* ------------------------------------------------------------------------ */
/* Assets — exported from the Figma file into public/figma                   */
/* ------------------------------------------------------------------------ */

const A = "/figma";

/** Fixed-size static asset. SVGs keep their own width/height. */
export function Asset({
  src,
  width,
  height,
  alt = "",
  className,
}: {
  src: string;
  width: number;
  height: number;
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={`${A}/${src}`}
      width={width}
      height={height}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      unoptimized
      loading="eager"
      className={cx("shrink-0", className)}
      style={{ width, height }}
    />
  );
}

/** Status-screen icons: 56px, mint-soft circle baked into each SVG (Figma). */
export type StatusIconName =
  | "hourglass"
  | "clock"
  | "link-off"
  | "circle-x"
  | "triangle-alert"
  | "smartphone"
  | "new-tab";

export function StatusIcon({ name }: { name: StatusIconName }) {
  return <Asset src={`icon-${name}.svg`} width={56} height={56} />;
}

/** "Done": solid mint circle with a white check (Figma 10). */
export function DoneIcon() {
  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-mint">
      <Asset src="check.svg" width={28} height={28} />
    </span>
  );
}

/** Mint arc spinner (Figma: rotate 360° / 1s). */
export function Spinner({ size = 56 }: { size?: 56 | 20 }) {
  return (
    <Asset
      src={size === 20 ? "spinner-button.svg" : "spinner.svg"}
      width={size}
      height={size}
      className="animate-ndi-spin"
    />
  );
}

/* ------------------------------------------------------------------------ */
/* Primitives                                                                */
/* ------------------------------------------------------------------------ */

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Bhutan NDI Wallet app icon: mint mark on a dark rounded tile (Figma). */
export function NdiMark() {
  const { t } = useI18n();
  return (
    <div
      role="img"
      aria-label={t.logoAlt}
      className="relative size-16 shrink-0 overflow-hidden rounded-[13px] bg-tile shadow-[0_4px_12px_rgba(0,0,0,0.14)]"
    >
      <Image
        src={`${A}/ndi-mark.png`}
        alt=""
        width={51}
        height={50}
        priority
        unoptimized
        className="absolute left-[6.47px] top-[7.17px] h-[49.65px] w-[51.07px] max-w-none object-cover"
      />
    </div>
  );
}

export function BrandName() {
  return <span className="text-mint">Bhutan NDI</span>;
}

/** EN | རྫོང་ཁ segmented switch, top-right of the card. Hidden when ENABLE_LANGUAGE_TOGGLE=false. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t, toggleEnabled } = useI18n();
  if (!toggleEnabled) return null;
  return (
    <div
      role="group"
      aria-label={t.languageLabel}
      className={cx("flex items-center rounded-[13px] border border-line bg-surface p-0.5", className)}
    >
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={active}
            onClick={() => setLang(l)}
            className={cx(
              // 22px tall in Figma; the ::before extends the tap target to 44px.
              "relative flex h-[22px] min-w-11 items-center justify-center rounded-[11px] px-[9px] transition-colors before:absolute before:-inset-y-[11px] before:inset-x-0",
              focusRing,
              l === "dz" ? "text-base leading-6" : "text-xs font-semibold leading-4",
              active ? "bg-primary text-white" : "text-label hover:bg-canvas",
            )}
          >
            {t.langShort[l]}
          </button>
        );
      })}
    </div>
  );
}

type ButtonBase = { children: ReactNode; className?: string };

const btn = cx(
  "inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[26px] bg-primary px-6 text-base font-semibold text-white transition-colors",
  focusRing,
);
/** Ready-screen buttons carry a soft shadow; status-screen buttons are flat (Figma). */
const raised = "shadow-[0_6px_14px_rgba(18,64,66,0.25)]";

export function PrimaryButton({
  children,
  className,
  flat = false,
  dim,
  ...rest
}: ButtonBase & { flat?: boolean; dim?: "loading" | "disabled" } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(
        btn,
        !flat && raised,
        // Figma: 70% while opening, 60% when disabled after a scan.
        dim === "loading" ? "cursor-progress bg-primary/70" : dim === "disabled" ? "cursor-not-allowed bg-primary/60" : "hover:bg-primary-hover",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PrimaryLink({ children, className, ...rest }: ButtonBase & ComponentProps<"a">) {
  return (
    <a className={cx(btn, "hover:bg-primary-hover", className)} {...rest}>
      {children}
    </a>
  );
}

/** "Use QR code instead" / "Hide QR code" (Figma: mint, chevron; grey when disabled). */
export function QrToggle({
  expanded,
  disabled,
  onClick,
}: {
  expanded: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg px-4 py-3 text-[15px] font-semibold",
        focusRing,
        disabled ? "text-disabled" : "text-mint hover:underline hover:underline-offset-4",
      )}
    >
      {expanded ? t.hideQr : t.useQr}
      <Asset
        src={expanded ? (disabled ? "chevron-up-disabled.svg" : "chevron-up.svg") : "chevron-down.svg"}
        width={14}
        height={14}
      />
    </button>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx("h-px w-full border-0 bg-line", className)} />;
}

/** The wallet's scan button, shown inline in the scan steps. */
export function ScanButton({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { t } = useI18n();
  const [w, h] = size === "lg" ? [28, 26] : [21.5, 20];
  return (
    <Asset src="scan-button.png" width={w} height={h} alt={t.scanButtonAlt} className="inline-block align-middle" />
  );
}

/** "1. Open … 2. Tap the scan button [icon] and scan this QR code" (Figma). */
export function ScanSteps({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { t } = useI18n();
  return (
    <ol
      className={cx(
        "list-decimal space-y-1.5 pl-4 text-left text-muted marker:text-muted",
        size === "lg" ? "w-full max-w-[324px] text-[15px] leading-[22px]" : "w-full max-w-[296px] text-sm leading-[20px]",
      )}
    >
      <li>{t.stepOpenWallet}</li>
      <li>
        <Fmt text={t.stepTapScan} values={{ scan: <ScanButton size={size} /> }} />
      </li>
    </ol>
  );
}

/* ------------------------------------------------------------------------ */
/* Footer: download + support                                                */
/* ------------------------------------------------------------------------ */

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";
const PLAY_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "https://play.google.com/store/search?q=bhutan%20ndi";
const APPSTORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/search?term=bhutan%20ndi";
const VIDEO_GUIDE_URL = process.env.NEXT_PUBLIC_VIDEO_GUIDE_URL ?? "";

const HAS_SUPPORT = Boolean(SUPPORT_EMAIL || SUPPORT_PHONE || VIDEO_GUIDE_URL);
const HAS_CONTACT = Boolean(SUPPORT_EMAIL || SUPPORT_PHONE);

/** App Store on iPhone/iPad, Google Play otherwise. Decided after mount to keep SSR stable. */
function useStoreUrl() {
  const [url, setUrl] = useState(PLAY_URL);
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios) setUrl(APPSTORE_URL);
  }, []);
  return url;
}

const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const quietLink = cx("rounded hover:text-ink", focusRing);

function NoAppLine({ className }: { className?: string }) {
  const { t } = useI18n();
  const store = useStoreUrl();
  return (
    <p className={cx("text-center text-muted", className)}>
      <Fmt
        text={t.noApp}
        values={{
          download: (
            <a href={store} {...external} className={cx("rounded font-semibold text-mint hover:underline", focusRing)}>
              {t.downloadNow}
            </a>
          ),
        }}
      />
    </p>
  );
}

function VideoGuideLink() {
  const { t } = useI18n();
  if (!VIDEO_GUIDE_URL) return null;
  return (
    <a href={VIDEO_GUIDE_URL} {...external} className={cx("inline-flex items-center gap-[5px] py-[7px]", quietLink)}>
      {t.watchGuide}
      <Asset src="play.svg" width={16} height={16} />
    </a>
  );
}

function Phone({ icon }: { icon: number }) {
  if (!SUPPORT_PHONE) return null;
  return (
    <a href={`tel:${SUPPORT_PHONE}`} className={cx("inline-flex items-center gap-[5px] py-[5px]", quietLink)}>
      <Asset src="call.svg" width={icon} height={icon} />
      {SUPPORT_PHONE}
    </a>
  );
}

function Email({ icon }: { icon: number }) {
  if (!SUPPORT_EMAIL) return null;
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className={cx("inline-flex items-center gap-[5px] py-[5px]", quietLink)}>
      <Asset src="mail.svg" width={icon} height={(icon * 2) / 3} />
      <span className="break-all">{SUPPORT_EMAIL}</span>
    </a>
  );
}

/**
 * Phone footer (Figma 3): "Don't have the wallet? Download Now!", then Get Support
 * with video guide, phone · email. Each support item shows only if configured.
 */
export function MobileFooter() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2.5 text-[13px]">
      <NoAppLine className="py-[7px]" />
      {HAS_SUPPORT && (
        <div className="flex flex-col items-center gap-0.5 pt-[11px] text-muted">
          <p className="font-semibold text-label">{t.support}</p>
          <VideoGuideLink />
          {HAS_CONTACT && (
            <div className="flex flex-wrap items-center justify-center gap-x-3">
              <Phone icon={16} />
              {SUPPORT_PHONE && SUPPORT_EMAIL && (
                <span className="text-dot" aria-hidden>
                  ·
                </span>
              )}
              <Email icon={16} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Outlined mint pill linking to the video guide (Figma 3w). */
function WatchGuideButton() {
  const { t } = useI18n();
  if (!VIDEO_GUIDE_URL) return null;
  return (
    <a
      href={VIDEO_GUIDE_URL}
      {...external}
      className={cx(
        "inline-flex h-10 min-w-[200px] items-center justify-center gap-3 rounded-full border-2 border-mint px-5 text-[15px] font-semibold text-primary hover:bg-mint-soft",
        focusRing,
      )}
    >
      {t.watchGuide}
      <Asset src="play.svg" width={20} height={20} />
    </a>
  );
}

const BADGE_W = 158;
const BADGE_H = 46;

/** Official store badges (public/badges), 158×46 each (Figma 3w). */
function StoreBadges() {
  const { t } = useI18n();
  // google-play.png is 646×250 with built-in padding; the badge itself is 562×166 at (42,42).
  const scale = BADGE_H / 166;
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <a
        href={PLAY_URL}
        {...external}
        aria-label={t.getItOnGooglePlay}
        className={cx("grid place-items-center", focusRing)}
        style={{ width: BADGE_W, height: BADGE_H }}
      >
        <span className="block overflow-hidden rounded-md" style={{ width: Math.round(562 * scale), height: BADGE_H }}>
          <Image
            src="/badges/google-play.png"
            alt=""
            width={Math.round(646 * scale)}
            height={Math.round(250 * scale)}
            loading="eager"
            unoptimized
            style={{ margin: -Math.round(42 * scale), maxWidth: "none" }}
          />
        </span>
      </a>
      <a
        href={APPSTORE_URL}
        {...external}
        aria-label={t.downloadOnAppStore}
        className={cx("grid place-items-center rounded-md", focusRing)}
        style={{ width: BADGE_W, height: BADGE_H }}
      >
        <Image src="/badges/app-store.svg" alt="" width={BADGE_W} height={BADGE_H} loading="eager" unoptimized />
      </a>
    </div>
  );
}

/** Desktop footer (Figma 3w): guide pill, download line + badges, Get Support (email, phone). */
export function WebFooter() {
  const { t } = useI18n();
  return (
    <>
      <WatchGuideButton />
      <div className="flex w-full flex-col items-center gap-[15px] text-[15px]">
        <NoAppLine />
        <StoreBadges />
      </div>
      {HAS_CONTACT && (
        <div className="flex flex-col items-center gap-[15px] text-[15px] text-muted">
          <p className="font-semibold text-label">{t.support}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5">
            <Email icon={20} />
            <Phone icon={20} />
          </div>
        </div>
      )}
    </>
  );
}
