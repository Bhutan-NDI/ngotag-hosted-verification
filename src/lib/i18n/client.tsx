"use client";

import { createContext, Fragment, useCallback, useContext, useState, type ReactNode } from "react";
import { DEFAULT_LANG, LANG_COOKIE, messages, type Lang, type Messages } from "./messages";

interface I18n {
  lang: Lang;
  t: Messages;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18n>({ lang: DEFAULT_LANG, t: messages[DEFAULT_LANG], setLang: () => {} });

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LANG_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }, []);
  return <Ctx.Provider value={{ lang, t: messages[lang], setLang }}>{children}</Ctx.Provider>;
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
