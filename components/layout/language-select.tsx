"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/dictionary";
import { LOCALES } from "@/lib/i18n/locales";

/** Each language's own name for itself — what a speaker looks for in a list. */
const NATIVE_NAMES: Record<Locale, string> = {
  bg: "Български",
  en: "English",
  el: "Ελληνικά",
  es: "Español",
};

/**
 * The language picker: a pill with the current language code (text only, no
 * flags) that opens a glass dropdown of every language — its own name, a check on the
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
        className={`group flex h-10 items-center gap-2 rounded-full border py-1 pr-2.5 pl-3.5 transition-all duration-300 ${
          isOpen
            ? "border-white/40 bg-white/15 shadow-[0_0_18px_-4px_rgba(255,255,255,0.45)]"
            : "border-white/10 bg-white/[0.05] hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.12]"
        }`}
      >
        <span className="text-xs font-bold tracking-wide text-foreground uppercase">{locale}</span>
        <ChevronDown
          size={14}
          className={`text-foreground/60 transition-transform duration-300 ${isOpen ? "rotate-180 text-foreground" : ""}`}
        />
      </button>

      <div
        role="listbox"
        aria-label={t("nav.languageAria")}
        className={`absolute top-[calc(100%+0.6rem)] right-0 z-50 w-56 origin-top-right rounded-[1.5rem] border border-white/15 bg-neutral-950/85 p-1.5 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-200 ease-out ${
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
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-foreground/85"}`}>{NATIVE_NAMES[option]}</span>
                <span className="text-[0.6875rem] font-medium tracking-wide text-foreground/40 uppercase">{option}</span>
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
