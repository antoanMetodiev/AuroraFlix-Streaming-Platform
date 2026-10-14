"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { LOCALES, type Locale } from "@/lib/i18n/dictionary";

/** Each language's own name for itself — what a speaker looks for in a list. */
const NATIVE_NAMES: Record<Locale, string> = {
  bg: "Български",
  en: "English",
  el: "Ελληνικά",
  es: "Español",
};

/**
 * Small round flags, drawn inline: emoji flags don't render on Windows, and
 * these stay crisp at any size. Each is scaled to cover the circle.
 */
function Flag({ locale, className = "" }: { locale: Locale; className?: string }) {
  const svg = (() => {
    switch (locale) {
      case "bg":
        return (
          <svg viewBox="0 0 30 18" preserveAspectRatio="xMidYMid slice">
            <rect width="30" height="6" fill="#ffffff" />
            <rect y="6" width="30" height="6" fill="#00966e" />
            <rect y="12" width="30" height="6" fill="#d62612" />
          </svg>
        );
      case "el":
        return (
          <svg viewBox="0 0 27 18" preserveAspectRatio="xMidYMid slice">
            <rect width="27" height="18" fill="#0d5eaf" />
            {[1, 3, 5, 7].map((stripe) => (
              <rect key={stripe} y={stripe * 2} width="27" height="2" fill="#ffffff" />
            ))}
            <rect width="10" height="10" fill="#0d5eaf" />
            <rect x="4" width="2" height="10" fill="#ffffff" />
            <rect y="4" width="10" height="2" fill="#ffffff" />
          </svg>
        );
      case "es":
        return (
          <svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice">
            <rect width="30" height="20" fill="#aa151b" />
            <rect y="5" width="30" height="10" fill="#f1bf00" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice">
            <rect width="60" height="30" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="2.5" />
            <path d="M30,0 V30 M0,15 H60" stroke="#ffffff" strokeWidth="10" />
            <path d="M30,0 V30 M0,15 H60" stroke="#c8102e" strokeWidth="6" />
          </svg>
        );
    }
  })();

  return (
    <span
      aria-hidden
      className={`block shrink-0 overflow-hidden rounded-full ring-1 ring-white/25 [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`}
    >
      {svg}
    </span>
  );
}

/**
 * The language picker: a pill with the current flag and code that opens a
 * glass dropdown of every language — flag, its own name, a check on the
 * current one. Closes on outside click, Escape, or after picking.
 */
export function LanguageSelect({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("nav.languageAria")}
        className={`group flex h-10 items-center gap-2 rounded-full border py-1 pr-2.5 pl-1.5 transition-all duration-300 ${
          isOpen
            ? "border-white/40 bg-white/15 shadow-[0_0_18px_-4px_rgba(255,255,255,0.45)]"
            : "border-foreground/10 bg-foreground/5 hover:border-white/25 hover:bg-foreground/10"
        }`}
      >
        <Flag locale={locale} className="h-7 w-7 transition-transform duration-300 group-hover:scale-105" />
        <span className="text-xs font-bold tracking-wide text-foreground uppercase">{locale}</span>
        <ChevronDown
          size={14}
          className={`text-foreground/60 transition-transform duration-300 ${isOpen ? "rotate-180 text-foreground" : ""}`}
        />
      </button>

      <div
        role="listbox"
        aria-label={t("nav.languageAria")}
        className={`absolute top-[calc(100%+0.6rem)] right-0 z-50 w-56 origin-top-right rounded-2xl border border-white/10 bg-surface/95 p-1.5 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl transition-all duration-200 ease-out ${
          isOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        {LOCALES.map((option, index) => {
          const isActive = option === locale;
          return (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={isActive}
              lang={option}
              onClick={() => {
                setLocale(option);
                setIsOpen(false);
              }}
              style={{ transitionDelay: isOpen ? `${index * 35}ms` : "0ms" }}
              className={`group/item flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-300 ${
                isOpen ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"
              } ${isActive ? "bg-white/10" : "hover:bg-white/[0.06]"}`}
            >
              <Flag locale={option} className="h-8 w-8 transition-transform duration-300 group-hover/item:scale-110" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-foreground/85"}`}>{NATIVE_NAMES[option]}</span>
                <span className="text-[11px] font-medium tracking-wide text-foreground/40 uppercase">{option}</span>
              </span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
                  isActive ? "scale-100 bg-white text-neutral-900 opacity-100" : "scale-50 opacity-0"
                }`}
              >
                <Check size={14} strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
