"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { loadConfig } from "@/lib/runtimeConfig";
import { DEFAULT_LANG, isLang, LANG_COOKIE, messages, type Lang, type Messages } from "./messages";

interface I18n {
  lang: Lang;
  t: Messages;
  setLang: (l: Lang) => void;
  /** Whether the EN / Dzongkha switch is shown (`languageToggle` in config.json). */
  toggleEnabled: boolean;
}

const Ctx = createContext<I18n>({
  lang: DEFAULT_LANG,
  t: messages[DEFAULT_LANG],
  setLang: () => {},
  toggleEnabled: false,
});

const cookieLang = (): Lang | undefined => {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`));
  return m && isLang(m[1]) ? m[1] : undefined;
};

/**
 * Language, chosen in the browser (static page). English is always the default.
 * Toggle off: always English. Toggle on: ?lang= (remembered) → cookie → browser language → English.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [toggleEnabled, setToggleEnabled] = useState(false);

  const apply = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
  }, []);
  const setLang = useCallback(
    (l: Lang) => {
      apply(l);
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${LANG_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    },
    [apply],
  );

  useEffect(() => {
    loadConfig().then(
      ({ languageToggle }) => {
        setToggleEnabled(languageToggle);
        if (!languageToggle) return;
        const fromUrl = new URLSearchParams(location.search).get("lang");
        if (isLang(fromUrl)) return setLang(fromUrl); // partners can link to a language
        const saved = cookieLang();
        if (saved) return apply(saved);
        if (navigator.languages?.some((l) => /^dz\b/i.test(l))) apply("dz");
      },
      () => {}, // no config: stay in English without the switch
    );
  }, [apply, setLang]);

  return <Ctx.Provider value={{ lang, t: messages[lang], setLang, toggleEnabled }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

/** Render a message, replacing {placeholders} with nodes. */
export function Fmt({ text, values = {} }: { text: string; values?: Record<string, ReactNode> }) {
  const parts = text.split(/(\{[a-z]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\{([a-z]+)\}$/.exec(p);
        return <Fragment key={i}>{m && m[1] in values ? values[m[1]] : p}</Fragment>;
      })}
    </>
  );
}
