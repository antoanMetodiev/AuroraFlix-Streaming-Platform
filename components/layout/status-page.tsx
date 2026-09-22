"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

type StatusPageProps = {
  /** Big dimmed numeral behind the heading — "404", "500", ... */
  code: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  /** Shown as a small mono line under the description (error digest). */
  detail?: string;
  detailLabelKey?: TranslationKey;
  /** Primary action — a retry button (error boundary) or nothing (404). */
  onRetry?: () => void;
};

/**
 * Shared full-page layout for app/not-found.tsx and app/error.tsx so a
 * broken link and a crashed segment look like the same site, not two
 * different apps. Renders inside the root layout (header/nav stay), so it
 * only owns the content area. Copy comes from the dictionary like every
 * other page — global-error.tsx is the one place that can't use this, since
 * it replaces the root layout (and LocaleProvider with it).
 */
export function StatusPage({ code, titleKey, descriptionKey, detail, detailLabelKey, onRetry }: StatusPageProps) {
  const { t } = useTranslation();

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden bg-background px-4 py-16 sm:px-6">
      {/* Soft radial glow so the page isn't a flat slab of near-black. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_60%)]"
      />

      <div className="relative flex w-full max-w-xl flex-col items-center text-center">
        <span
          aria-hidden
          className="select-none font-mono text-[7rem] font-bold leading-none tracking-tighter text-foreground/[0.07] sm:text-[10rem]"
        >
          {code}
        </span>

        <h1 className="-mt-6 text-3xl font-bold tracking-tight text-foreground sm:-mt-10 sm:text-4xl">{t(titleKey)}</h1>
        <p className="mt-3 max-w-md text-sm text-foreground/50 sm:text-base">{t(descriptionKey)}</p>

        {detail && (
          <p className="mt-4 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 font-mono text-xs text-foreground/40">
            {detailLabelKey && <span className="mr-1.5 text-foreground/30">{t(detailLabelKey)}:</span>}
            {detail}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                {t("status.retry")}
              </button>
              <Link
                href="/"
                className="rounded-full border border-foreground/15 bg-foreground/10 px-5 py-2.5 text-sm font-medium text-foreground/80 backdrop-blur-md transition-colors hover:bg-foreground/15"
              >
                {t("status.goHome")}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                {t("status.goHome")}
              </Link>
              <Link
                href="/movies"
                className="rounded-full border border-foreground/15 bg-foreground/10 px-5 py-2.5 text-sm font-medium text-foreground/80 backdrop-blur-md transition-colors hover:bg-foreground/15"
              >
                {t("status.browseMovies")}
              </Link>
              <Link
                href="/series"
                className="rounded-full border border-foreground/15 bg-foreground/10 px-5 py-2.5 text-sm font-medium text-foreground/80 backdrop-blur-md transition-colors hover:bg-foreground/15"
              >
                {t("status.browseSeries")}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
