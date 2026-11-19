"use client";

import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { Fmt, useI18n } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/messages";

/* ------------------------------------------------------------------------ */
/* Icons (inline, 24px grid, stroke-based)                                   */
/* ------------------------------------------------------------------------ */

type IconProps = { className?: string };
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icon = {
  ArrowRight: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Retry: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Check: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  X: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Alert: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M12 3l9.5 17h-19L12 3z" />
      <path d="M12 10v4M12 17.5v.01" />
    </svg>
  ),
  Hourglass: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />
    </svg>
  ),
  Clock: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  LinkOff: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M9 15l6-6M10.5 6.5l1.8-1.8a4.2 4.2 0 0 1 6 6l-1.8 1.8M13.5 17.5l-1.8 1.8a4.2 4.2 0 0 1-6-6l1.8-1.8M3 3l18 18" />
    </svg>
  ),
  Ban: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  ),
  WifiOff: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.2-1.6M2 9.5a15 15 0 0 1 4.3-2.7M22 9.5A15 15 0 0 0 11 5.1M12 20h.01" />
    </svg>
  ),
  Phone: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  ),
  Mail: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6l8.5 7 8.5-7" />
    </svg>
  ),
  Call: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
    </svg>
  ),
  ChevronDown: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Play: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M10 8.5v7l5.5-3.5z" fill="white" />
    </svg>
  ),
  Scan: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </svg>
  ),
};

/* ------------------------------------------------------------------------ */
/* Primitives                                                                */
/* ------------------------------------------------------------------------ */

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("animate-ndi-spin", className)} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Bhutan NDI wallet mark (mint on a dark tile, like the app icon). */
/** Bhutan NDI app icon (public/center-icon.png, 88×88 — sharp up to ~64px). */
export function NdiMark({ size = 64 }: { size?: number }) {
  const { t } = useI18n();
  return (
    <Image
      src="/center-icon.png"
      alt={t.logoAlt}
      width={size}
      height={size}
      priority
      unoptimized
      className="drop-shadow-sm"
    />
  );
}

export function BrandName() {
  return <span className="text-brand">Bhutan NDI</span>;
}

/** EN | རྫོང་ཁ segmented switch. Hidden when ENABLE_LANGUAGE_TOGGLE=false. */
export function LanguageToggle() {
  const { lang, setLang, t, toggleEnabled } = useI18n();
  if (!toggleEnabled) return null;
  return (
    <div
      role="group"
      aria-label={t.languageLabel}
      className="inline-flex items-center rounded-full border border-line bg-surface p-0.5"
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
              "h-8 min-w-11 rounded-full px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
              // Tibetan script needs more size and weight to read at the same scale.
              l === "dz" ? "text-[15px] font-bold leading-none" : "text-xs font-semibold",
              active ? "bg-primary text-white" : "text-ink hover:bg-neutral-soft",
            )}
          >
            {t.langShort[l]}
          </button>
        );
      })}
    </div>
  );
}

type ButtonBase = { children: ReactNode; className?: string; block?: boolean };

const btn =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 min-h-12 py-2 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed";
/** Main call to action: tall dark pill with a soft shadow (Figma). */
const primary =
  "min-h-14 text-base bg-primary text-white shadow-[0_8px_20px_-8px_rgba(30,59,51,.55)] hover:bg-primary-hover";

export function PrimaryButton({ children, className, block = true, ...rest }: ButtonBase & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(btn, primary, "disabled:bg-primary/60 disabled:shadow-none", block && "w-full", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PrimaryLink({ children, className, block = true, ...rest }: ButtonBase & ComponentProps<"a">) {
  return (
    <a className={cx(btn, primary, block && "w-full", className)} {...rest}>
      {children}
    </a>
  );
}

export function SecondaryLink({ children, className, block = false, ...rest }: ButtonBase & ComponentProps<"a">) {
  return (
    <a
      className={cx(btn, "min-h-10 border border-line bg-surface text-sm text-ink hover:bg-neutral-soft", block && "w-full", className)}
      {...rest}
    >
      {children}
    </a>
  );
}

export function TextButton({ children, className, ...rest }: ButtonBase & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(
        "rounded text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TextLink({ children, className, ...rest }: ButtonBase & ComponentProps<"a">) {
  return (
    <a
      className={cx(
        "rounded text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand",
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Divider() {
  return <hr className="my-6 border-0 border-t border-line" />;
}

/* ------------------------------------------------------------------------ */
/* Composite blocks                                                          */
/* ------------------------------------------------------------------------ */

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";
const PLAY_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "https://play.google.com/store/search?q=bhutan%20ndi";
const APPSTORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/search?term=bhutan%20ndi";

const VIDEO_GUIDE_URL = process.env.NEXT_PUBLIC_VIDEO_GUIDE_URL ?? "";

export const HAS_SUPPORT = Boolean(SUPPORT_EMAIL || SUPPORT_PHONE || VIDEO_GUIDE_URL);

/**
 * "Get Support": optional video guide, then phone · email.
 * Each item shows only if configured; nothing renders if none are.
 */
export function SupportFooter({ divider = true }: { divider?: boolean }) {
  const { t } = useI18n();
  if (!HAS_SUPPORT) return null;
  return (
    <>
      {divider && <Divider />}
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">{t.support}</p>
        {VIDEO_GUIDE_URL && (
          <a
            href={VIDEO_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            {t.watchGuide}
            <Icon.Play className="size-4 text-mint" />
          </a>
        )}
        {(SUPPORT_PHONE || SUPPORT_EMAIL) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted">
            {SUPPORT_PHONE && (
              <a href={`tel:${SUPPORT_PHONE}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Icon.Call className="size-4 text-mint" />
                {SUPPORT_PHONE}
              </a>
            )}
            {SUPPORT_PHONE && SUPPORT_EMAIL && (
              <span className="text-subtle" aria-hidden>
                ·
              </span>
            )}
            {SUPPORT_EMAIL && (
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Icon.Mail className="size-4 text-mint" />
                {SUPPORT_EMAIL}
              </a>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const BADGE_H = 40;

/** Official store badges (public/badges). */
export function StoreBadges() {
  const { t } = useI18n();
  // google-play.png is 646×250 with built-in padding; the badge itself is 562×166 at (42,42).
  const scale = BADGE_H / 166;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a
        href={PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.getItOnGooglePlay}
        className="block overflow-hidden rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        style={{ width: Math.round(562 * scale), height: BADGE_H }}
      >
        <Image
          src="/badges/google-play.png"
          alt=""
          width={Math.round(646 * scale)}
          height={Math.round(250 * scale)}
          style={{ margin: -Math.round(42 * scale), maxWidth: "none" }}
        />
      </a>
      <a
        href={APPSTORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.downloadOnAppStore}
        className="block rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Image src="/badges/app-store.svg" alt="" width={Math.round(BADGE_H * 2.99)} height={BADGE_H} unoptimized />
      </a>
    </div>
  );
}

/**
 * Outlined mint pill linking to the video guide (Figma web).
 * Renders nothing until NEXT_PUBLIC_VIDEO_GUIDE_URL is set.
 */
export function WatchGuideButton({ className }: { className?: string }) {
  const { t } = useI18n();
  if (!VIDEO_GUIDE_URL) return null;
  return (
    <div className={cx("flex justify-center", className)}>
      <a
        href={VIDEO_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2.5 rounded-full border-2 border-mint px-5 text-sm font-semibold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {t.watchGuide}
        <Icon.Play className="size-5 text-mint" />
      </a>
    </div>
  );
}

export function GetTheApp() {
  const { t } = useI18n();
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-ink">
        <Fmt text={t.noApp} values={{ brand: <BrandName /> }} />
      </p>
      <div className="mt-3">
        <StoreBadges />
      </div>
    </div>
  );
}

type Tone = "neutral" | "success" | "danger" | "warn";
const toneClass: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-muted",
  success: "bg-brand-soft text-brand",
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <div className={cx("mx-auto grid size-14 place-items-center rounded-full", toneClass[tone])}>{children}</div>;
}

export function Steps({ items, done = 0 }: { items: ReactNode[]; done?: number }) {
  return (
    <ol className="space-y-2.5 text-left text-sm text-muted">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className={cx(
              "mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
              i < done ? "bg-brand text-white" : "bg-neutral-soft text-ink",
            )}
          >
            {i < done ? <Icon.Check className="size-3" /> : i + 1}
          </span>
          <span className="leading-5">{item}</span>
        </li>
      ))}
    </ol>
  );
}
