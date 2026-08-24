"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { dictionary, type Locale, type TranslationKey } from "./dictionary";

export const LOCALE_COOKIE_NAME = "auroraflix_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * `initialLocale` is resolved server-side (see app/layout.tsx: the
 * `auroraflix_locale` cookie if set, else the request's Accept-Language header)
 * so the very first render — server AND client — always agrees on the same
 * value. That's the fix for a hydration mismatch this used to have: this
 * provider previously flipped from a server-only "en" default to the real
 * client locale right after its own hydration. That flip raced any Suspense
 * boundary elsewhere on the page that hadn't hydrated yet (e.g. the list-page
 * results, streamed in after a backend fetch) — by the time that boundary's
 * HTML actually hydrated, it picked up the already-flipped context value and
 * mismatched against the "old-locale" HTML the server had sent for it.
 * Resolving the locale before the first render exists removes that race
 * outright instead of trying to win it.
 */
export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

export function useTranslation() {
  const { locale, setLocale } = useLocale();

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text: string = dictionary[key][locale];
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replace(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [locale]
  );

  return { t, locale, setLocale };
}
