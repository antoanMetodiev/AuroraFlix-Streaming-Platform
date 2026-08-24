"use client";

import { useTranslation } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/dictionary";

const OPTIONS: Locale[] = ["en", "bg"];

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("nav.languageAria")}
      className={`flex items-center gap-0.5 rounded-full border border-foreground/10 bg-foreground/5 p-1 ${className}`}
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          className={`rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
            locale === option
              ? "bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white shadow-[0_2px_10px_-2px_rgba(142,45,226,0.7)]"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
