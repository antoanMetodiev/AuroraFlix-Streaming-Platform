"use client";

import Link from "next/link";
import { Clapperboard, Tv } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const OPTIONS = [
  { type: "movie", labelKey: "order.movie", icon: Clapperboard },
  { type: "series", labelKey: "order.series", icon: Tv },
] as const satisfies { type: string; labelKey: TranslationKey; icon: unknown }[];

export function OrderSelectPage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen w-full">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{t("order.selectTitle")}</h1>
        <p className="mt-4 max-w-md text-sm text-foreground/50 sm:text-base">{t("order.selectDesc")}</p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row">
          {OPTIONS.map(({ type, labelKey, icon: Icon }) => (
            <Link
              key={type}
              href={`/order/${type}`}
              className="group flex flex-1 flex-col items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 px-6 py-8 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:bg-white hover:shadow-[0_20px_45px_-15px_rgba(255,255,255,0.45)]"
            >
              <Icon size={32} className="text-foreground/70 transition-colors group-hover:text-neutral-900" />
              <span className="text-lg font-semibold text-foreground transition-colors group-hover:text-neutral-900">{t(labelKey)}</span>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
