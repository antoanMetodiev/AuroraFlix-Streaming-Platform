"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Footer } from "@/components/layout/footer";
import { Loader } from "@/components/ui/loader";
import { useSubscription } from "@/lib/use-subscription";
import { useTranslation } from "@/lib/i18n/locale-context";

export function SubscriptionView() {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useUser();
  const { subscription, isLoading } = useSubscription();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState(false);

  const openPortal = async () => {
    setPortalError(false);
    setIsOpeningPortal(true);

    try {
      const response = await fetch("/api/payments/portal-session", { method: "POST" });
      const data = (await response.json()) as { url?: string };
      if (!response.ok || !data.url) throw new Error("portal session request failed");
      window.location.href = data.url;
    } catch {
      setPortalError(true);
      setIsOpeningPortal(false);
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Loader />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("subscription.signInTitle")}</h1>
          <p className="text-sm text-foreground/60">{t("subscription.signInDesc")}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const isPro = subscription?.plan === "PRO";
  const periodEndDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="relative min-h-screen w-full bg-background">
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-16 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{t("subscription.title")}</h1>
        <p className="mt-2 text-sm text-foreground/50">{t("subscription.subtitle")}</p>

        <div className="mt-10 rounded-2xl border border-foreground/10 bg-foreground/5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-foreground/40 uppercase">{t("subscription.currentPlan")}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{isPro ? t("pricing.proName") : t("pricing.freeName")}</p>
            </div>

            {isPro && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  subscription?.cancelAtPeriodEnd ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {subscription?.cancelAtPeriodEnd ? t("subscription.statusCanceling") : t("subscription.statusActive")}
              </span>
            )}
          </div>

          {isPro && periodEndDate && (
            <p className="mt-4 text-sm text-foreground/60">
              {subscription?.cancelAtPeriodEnd
                ? t("subscription.endsOn", { date: periodEndDate })
                : t("subscription.renewsOn", { date: periodEndDate })}
            </p>
          )}

          {!isPro && <p className="mt-4 text-sm text-foreground/60">{t("subscription.freeDesc")}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            {isPro ? (
              <button
                type="button"
                disabled={isOpeningPortal}
                onClick={openPortal}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_rgba(255,255,255,0.3)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <CreditCard size={16} />
                {isOpeningPortal ? t("pricing.redirecting") : t("subscription.manage")}
              </button>
            ) : (
              <Link
                href="/#pricing"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                {t("pricing.proCta")}
              </Link>
            )}
          </div>

          {portalError && <p className="mt-3 text-xs text-red-400">{t("subscription.portalError")}</p>}
        </div>

        {isPro && <p className="mt-6 text-xs text-foreground/40">{t("subscription.manageHint")}</p>}
      </div>

      <Footer />
    </div>
  );
}
