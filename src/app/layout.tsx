import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { I18nProvider } from "@/lib/i18n/client";
import { DEFAULT_LANG } from "@/lib/i18n/messages";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

/**
 * Noto Serif Tibetan (OFL), Tibetan-script subset, variable weight.
 * Tibetan glyphs sit small next to Inter, so scale them up — Latin text is
 * unaffected because the face only covers the Tibetan block. It downloads
 * only when Dzongkha text is on screen.
 */
const tibetan = localFont({
  src: "../fonts/noto-serif-tibetan.woff2",
  variable: "--font-tibetan",
  weight: "400 700",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0F00-0FFF, U+200C-200D, U+25CC" },
    { prop: "size-adjust", value: "112%" },
  ],
});

export const metadata: Metadata = {
  title: "Bhutan NDI",
  description: "Verify your identity with the Bhutan NDI Wallet",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  icons: { icon: "/ndi-mark-mint.png" },
};

export const viewport: Viewport = {
  themeColor: "#eef2f1",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables must live on <html>: Tailwind defines --font-sans on :root,
    // and it can only resolve var(--font-inter)/var(--font-tibetan) there.
    // lang is set again in the browser once the language is known (I18nProvider).
    <html lang={DEFAULT_LANG} className={`${inter.variable} ${tibetan.variable}`}>
      <body className="antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
