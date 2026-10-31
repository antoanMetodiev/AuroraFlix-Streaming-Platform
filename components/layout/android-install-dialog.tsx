"use client";

import { Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, ShieldAlert, Tv, X } from "lucide-react";
import { FaAndroid } from "react-icons/fa";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const STEPS: TranslationKey[] = ["install.step1", "install.step2", "install.step3", "install.step4", "install.step5"];

// The step texts mark button / menu names with **…** so they stand out —
// people scan for the exact word they have to tap.
function withBold(text: string) {
  return text.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-bold text-foreground">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  );
}

// A sketch of Play Protect's warning, marking which buttons to tap — the
// step people get stuck on.
function PlayProtectSketch() {
  const { t } = useTranslation();

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3.5">
      <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-foreground/90">
        <ShieldAlert size={15} className="text-amber-400" />
        {t("install.mockTitle")}
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="h-1.5 w-11/12 rounded-full bg-foreground/10" />
        <div className="h-1.5 w-2/3 rounded-full bg-foreground/10" />
      </div>

      <div className="mt-3.5 flex items-end justify-between gap-2">
        <div className="flex flex-col items-start gap-1">
          <span className="text-[0.625rem] font-bold tracking-wide text-[#3DDC84] uppercase">{t("install.mockTapThis")} ↓</span>
          <span className="rounded-lg border-2 border-[#3DDC84] px-2.5 py-1 text-xs font-bold text-[#3DDC84] shadow-[0_0_16px_-4px_rgba(61,220,132,0.8)]">
            {t("install.mockMore")}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[0.625rem] font-bold tracking-wide text-red-400 uppercase">✕ {t("install.mockNotThis")}</span>
          <span className="rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground/35 line-through">OK</span>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-start gap-1 border-t border-white/10 pt-3">
        <span className="text-[0.625rem] font-bold tracking-wide text-[#3DDC84] uppercase">{t("install.mockThenThis")} ↓</span>
        <span className="rounded-lg border-2 border-[#3DDC84] px-2.5 py-1 text-xs font-bold text-[#3DDC84] shadow-[0_0_16px_-4px_rgba(61,220,132,0.8)]">
          {t("install.mockAnyway")}
        </span>
      </div>
    </div>
  );
}

// Shown alongside the APK download: sideloading trips Google Play Protect's
// warning on many phones, and people who don't tap "More details" think the
// app can't be installed at all. Portaled onto document.body for the same
// reason as FriendsModal (the header's backdrop-blur would trap it).
export function AndroidInstallDialog({ apkUrl, onClose }: { apkUrl: string; onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-4" onClick={onClose}>
      <div className="animate-modal-backdrop-in absolute inset-0 bg-black/75 backdrop-blur-md" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-install-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-modal-card-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-[0_30px_90px_-15px_rgba(0,0,0,0.7)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#3DDC84]/[0.08] to-transparent" />

        <div className="relative flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3DDC84] text-neutral-900 shadow-[0_0_24px_-6px_rgba(61,220,132,0.7)]">
              <FaAndroid size={22} />
            </span>
            <div>
              <h2 id="android-install-title" className="text-lg leading-tight font-bold tracking-tight text-foreground">
                {t("install.title")}
              </h2>
              <p className="mt-0.5 text-sm text-foreground/60">{t("install.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("nav.closeMenu")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground/60 transition-all duration-200 hover:scale-105 hover:bg-foreground/10 hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        <ol className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pb-2">
          {STEPS.map((key, index) => {
            const isWarningStep = key === "install.step4";
            return (
              <li
                key={key}
                className={`flex gap-3 rounded-2xl border p-3.5 ${
                  isWarningStep ? "border-amber-400/40 bg-amber-400/[0.08]" : "border-white/[0.06] bg-foreground/[0.03]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isWarningStep ? "bg-amber-400 text-neutral-900" : "bg-foreground/10 text-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-foreground/80">
                  {withBold(t(key))}
                  {isWarningStep && (
                    <>
                      <PlayProtectSketch />
                      <p className="mt-2 text-xs text-foreground/55">{t("install.step4Note")}</p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {/* A TV has no file manager to open the download with, and needs the 32-bit build. */}
          <li className="flex gap-3 rounded-2xl border border-white/[0.06] bg-foreground/[0.03] p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground">
              <Tv size={15} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-foreground/80">
              <p className="font-semibold text-foreground">{t("install.tvTitle")}</p>
              <p className="mt-0.5">{withBold(t("install.tvText"))}</p>
            </div>
          </li>
        </ol>

        <div className="relative flex shrink-0 items-center gap-2 px-6 pt-3 pb-6">
          <a
            href={apkUrl}
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#3DDC84]/40 py-2.5 text-sm font-semibold text-[#3DDC84] transition-colors hover:bg-[#3DDC84]/10"
          >
            <Download size={15} />
            {t("install.downloadAgain")}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-white py-2.5 text-sm font-semibold text-neutral-900 transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t("install.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
