"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { SignUpButton, useUser } from "@clerk/nextjs";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { useTranslation } from "@/lib/i18n/locale-context";
import { useCurrentUser } from "@/lib/use-current-user";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { TranslationKey } from "@/lib/i18n/dictionary";

type Plan = {
  id: "free" | "pro";
  nameKey: TranslationKey;
  descKey: TranslationKey;
  priceKey: TranslationKey;
  periodKey: TranslationKey;
  featureKeys: TranslationKey[];
  ctaKey: TranslationKey;
  highlighted: boolean;
};

// Mirrors SubscriptionType on the backend (lumo-user-svc): "free" -> REGULAR_USER,
// "pro" -> PRO_USER.
const PLANS: Plan[] = [
  {
    id: "free",
    nameKey: "pricing.freeName",
    descKey: "pricing.freeDesc",
    priceKey: "pricing.freePrice",
    periodKey: "pricing.freePeriod",
    featureKeys: ["pricing.freeFeature1", "pricing.freeFeature2", "pricing.freeFeature3", "pricing.freeFeature4"],
    ctaKey: "pricing.freeCta",
    highlighted: false,
  },
  {
    id: "pro",
    nameKey: "pricing.proName",
    descKey: "pricing.proDesc",
    priceKey: "pricing.proPrice",
    periodKey: "pricing.proPeriod",
    featureKeys: [
      "pricing.proFeature1",
      "pricing.proFeature2",
      "pricing.proFeature3",
      "pricing.proFeature4",
      "pricing.proFeature5",
      "pricing.proFeature6",
    ],
    ctaKey: "pricing.proCta",
    highlighted: true,
  },
];

const CTA_CLASSNAME =
  "mt-8 w-full rounded-xl px-5 py-3 text-sm font-semibold tracking-wide transition-all duration-200 disabled:cursor-default disabled:opacity-70";
const CTA_HIGHLIGHTED_CLASSNAME =
  "bg-white text-neutral-900 shadow-[0_8px_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(255,255,255,0.4)] disabled:hover:translate-y-0";
const CTA_INERT_CLASSNAME = "cursor-default border border-foreground/15 bg-foreground/5 text-foreground/50";

export function PricingSection() {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useUser();
  const { user } = useCurrentUser();
  const isPro = user?.subscriptionType === "PRO_USER";
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const { ref, inView } = useInViewOnce<HTMLElement>(0.2);

  const startCheckout = async () => {
    setCheckoutError(false);
    setIsRedirecting(true);

    try {
      const response = await fetch("/api/payments/checkout-session", { method: "POST" });
      const data = (await response.json()) as { url?: string };
      if (!response.ok || !data.url) throw new Error("checkout session request failed");
      window.location.href = data.url;
    } catch {
      setCheckoutError(true);
      setIsRedirecting(false);
    }
  };

  return (
    <section
      ref={ref}
      aria-label={t("pricing.sectionAria")}
      className="bg-grain relative z-10 overflow-hidden bg-background px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:px-8"
    >
      <div className="mx-auto max-w-4xl">
        <div className={`reveal ${inView ? "" : "reveal-hidden"}`}>
          <SectionHeading>{t("pricing.title")}</SectionHeading>
          <p id="pricing" className="-mt-4 mb-10 max-w-xl scroll-mt-[125px] text-sm text-foreground/60 sm:mb-12 sm:text-base">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              style={{ transitionDelay: `${index * 110}ms` }}
              className={`reveal relative flex flex-col rounded-2xl border p-6 sm:p-8 ${inView ? "" : "reveal-hidden"} ${
                plan.highlighted
                  ? "border-white/40 bg-surface shadow-[0_0_50px_rgba(255,255,255,0.14)] sm:-my-3 sm:py-9"
                  : "border-foreground/10 bg-foreground/5"
              }`}
            >
              {plan.highlighted && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-6 -top-10 -z-10 h-24 rounded-full bg-white/20 blur-3xl"
                />
              )}

              {plan.highlighted && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-[0_4px_14px_rgba(255,255,255,0.4)]">
                  <Sparkles size={12} />
                  {t("pricing.mostPopular")}
                </span>
              )}

              <h3 className="text-lg font-bold text-foreground sm:text-xl">{t(plan.nameKey)}</h3>
              <p className="mt-1 text-sm text-foreground/60">{t(plan.descKey)}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground sm:text-4xl">{t(plan.priceKey)}</span>
                <span className="text-sm text-foreground/50">{t(plan.periodKey)}</span>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.featureKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-foreground/75">
                    <Check size={16} className={`mt-0.5 shrink-0 ${plan.highlighted ? "text-white" : "text-foreground/40"}`} />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              {plan.highlighted ? (
                isSignedIn ? (
                  isPro ? (
                    <button type="button" disabled className={`${CTA_CLASSNAME} ${CTA_INERT_CLASSNAME}`}>
                      {t("pricing.proCtaCurrent")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isRedirecting}
                      onClick={startCheckout}
                      className={`${CTA_CLASSNAME} ${CTA_HIGHLIGHTED_CLASSNAME}`}
                    >
                      {isRedirecting ? t("pricing.redirecting") : t(plan.ctaKey)}
                    </button>
                  )
                ) : (
                  // Not signed in: open Clerk's sign-up modal first. They land back
                  // on this page and can click again once they have an account —
                  // no "resume checkout automatically" flow, deliberately kept simple.
                  <SignUpButton mode="modal">
                    <button type="button" disabled={!isLoaded} className={`${CTA_CLASSNAME} ${CTA_HIGHLIGHTED_CLASSNAME}`}>
                      {t(plan.ctaKey)}
                    </button>
                  </SignUpButton>
                )
              ) : (
                <button type="button" disabled className={`${CTA_CLASSNAME} ${CTA_INERT_CLASSNAME}`}>
                  {isPro ? t("pricing.freeCtaIncludedInPro") : t(plan.ctaKey)}
                </button>
              )}

              {plan.highlighted && isRedirecting && (
                <p className="mt-2 text-xs text-foreground/50">{t("pricing.pleaseWait")}</p>
              )}

              {plan.highlighted && checkoutError && (
                <p className="mt-2 text-xs text-red-400">{t("pricing.checkoutError")}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
