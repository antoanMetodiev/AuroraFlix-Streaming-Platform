"use client"; // Error boundaries must be Client Components 
// test commit

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n/dictionary";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-cookie";
import "./globals.css";

const LOCALE_COOKIE_RE = new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=(en|bg|el|es)`);

function readLocaleCookie(): Locale {
  const match = document.cookie.match(LOCALE_COOKIE_RE);
  return match ? (match[1] as Locale) : "en";
}

// This page's own copy, inlined (same text as the status.* keys in the
// dictionaries): importing translate() here would put all four languages'
// dictionaries into the bundle every page ships with.
const COPY = {
  en: { errorTitle: "Something went wrong", errorDesc: "An unexpected error interrupted this page. It's usually temporary — try again in a moment.", errorCode: "Error code", retry: "Try again", goHome: "Go to homepage" },
  bg: { errorTitle: "Нещо се обърка", errorDesc: "Неочаквана грешка прекъсна страницата. Обикновено е временно — опитай пак след малко.", errorCode: "Код на грешката", retry: "Опитай отново", goHome: "Към началото" },
  el: { errorTitle: "Κάτι πήγε στραβά", errorDesc: "Ένα απρόσμενο σφάλμα διέκοψε τη σελίδα. Συνήθως είναι προσωρινό — δοκίμασε ξανά σε λίγο.", errorCode: "Κωδικός σφάλματος", retry: "Δοκίμασε ξανά", goHome: "Αρχική σελίδα" },
  es: { errorTitle: "Algo salió mal", errorDesc: "Un error inesperado interrumpió esta página. Suele ser temporal — inténtalo de nuevo en un momento.", errorCode: "Código de error", retry: "Reintentar", goHome: "Ir al inicio" },
} satisfies Record<Locale, Record<string, string>>;

// Cookies don't change while this page is up; subscribe is a no-op.
const noopSubscribe = () => () => {};

/**
 * Last-resort boundary: only fires when the root layout itself throws
 * (app/error.tsx covers everything below it). It replaces the root layout
 * entirely, so there's no LocaleProvider, no header, no fonts — it has to
 * carry its own <html>/<body>, pull in globals.css itself, and read the
 * locale cookie by hand instead of via useTranslation(). Kept deliberately
 * plain: if this is showing, the less it depends on, the better.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  // useSyncExternalStore's server snapshot ("en") is what both the server
  // render and the hydration pass use, then the client snapshot (the real
  // cookie) takes over — no hydration mismatch, no setState-in-effect.
  const locale = useSyncExternalStore(noopSubscribe, readLocaleCookie, () => "en" as Locale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const t = (key: keyof (typeof COPY)["en"]) => COPY[locale][key];

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-background px-4 py-16 text-center text-foreground">
        <title>{`${t("errorTitle")} | AuroraFlix`}</title>
        <span aria-hidden className="select-none font-mono text-[7rem] font-bold leading-none tracking-tighter text-foreground/[0.07] sm:text-[10rem]">
          500
        </span>
        <h1 className="-mt-6 text-3xl font-bold tracking-tight sm:-mt-10 sm:text-4xl">{t("errorTitle")}</h1>
        <p className="mt-3 max-w-md text-sm text-foreground/50 sm:text-base">{t("errorDesc")}</p>
        {error.digest && (
          <p className="mt-4 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 font-mono text-xs text-foreground/40">
            <span className="mr-1.5 text-foreground/30">{t("errorCode")}:</span>
            {error.digest}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="rounded-full border border-foreground/15 bg-foreground/10 px-5 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/15"
          >
            {t("goHome")}
          </Link>
        </div>
      </body>
    </html>
  );
}
