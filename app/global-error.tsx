"use client"; // Error boundaries must be Client Components 
// test commit

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { dictionary, type Locale } from "@/lib/i18n/dictionary";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-context";
import "./globals.css";

const LOCALE_COOKIE_RE = new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=(en|bg)`);

function readLocaleCookie(): Locale {
  const match = document.cookie.match(LOCALE_COOKIE_RE);
  return match ? (match[1] as Locale) : "en";
}

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

  const t = (key: keyof typeof dictionary) => dictionary[key][locale];

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-background px-4 py-16 text-center text-foreground">
        <title>{`${t("status.errorTitle")} | AuroraFlix`}</title>
        <span aria-hidden className="select-none font-mono text-[7rem] font-bold leading-none tracking-tighter text-foreground/[0.07] sm:text-[10rem]">
          500
        </span>
        <h1 className="-mt-6 text-3xl font-bold tracking-tight sm:-mt-10 sm:text-4xl">{t("status.errorTitle")}</h1>
        <p className="mt-3 max-w-md text-sm text-foreground/50 sm:text-base">{t("status.errorDesc")}</p>
        {error.digest && (
          <p className="mt-4 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 font-mono text-xs text-foreground/40">
            <span className="mr-1.5 text-foreground/30">{t("status.errorCode")}:</span>
            {error.digest}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t("status.retry")}
          </button>
          <Link
            href="/"
            className="rounded-full border border-foreground/15 bg-foreground/10 px-5 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/15"
          >
            {t("status.goHome")}
          </Link>
        </div>
      </body>
    </html>
  );
}
