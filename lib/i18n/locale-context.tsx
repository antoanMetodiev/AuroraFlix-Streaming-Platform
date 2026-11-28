"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Locale, TranslationKey } from "./dictionary";
import type { Messages } from "./messages/types";
import { LOCALE_COOKIE_NAME } from "./locale-cookie";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * `initialLocale` is resolved server-side (see app/layout.tsx: the
 * `auroraflix_locale` cookie if set, else the visitor's country — detectLocale)
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
function saveLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * `messages`: the visitor's language only, built on the server by the root
 * layout (lib/i18n/messages/get-messages.ts) — see Messages for why.
 */
export function LocaleProvider({
  children,
  initialLocale,
  messages,
}: {
  children: ReactNode;
  initialLocale: Locale;
  messages: Messages;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Switching language reloads the page: the server renders it again in the
  // new language, including the titles, descriptions and artwork it fetches
  // from the backend (lib/api.ts) — swapping only the UI strings would leave
  // those in the old one.
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    saveLocaleCookie(next);
    document.documentElement.lang = next;
    window.location.reload();
  }, []);

  // The first visit's language was picked from the visitor's country (see
  // detectLocale) — remember it, so it stays the same on later visits even
  // from abroad, until they pick another one.
  useEffect(() => {
    if (!document.cookie.includes(`${LOCALE_COOKIE_NAME}=`)) saveLocaleCookie(initialLocale);
  }, [initialLocale]);

  return <LocaleContext.Provider value={{ locale, setLocale, messages }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

export function useTranslation() {
  const { locale, setLocale, messages } = useLocale();

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text = messages.strings[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replace(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [messages]
  );

  /** A genre name (the backend's English one, e.g. "Action") in this language. */
  const genre = useCallback((name: string) => messages.genres[name] ?? name, [messages]);

  return { t, genre, locale, setLocale };
}
