"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n/locale-context";

// What the backend actually reports (see lumo-payments-svc's
// CheckoutResultResponse) — it never says "failed" itself, since it has no
// reliable clock for "how long is too long" (see that class's doc comment).
type ServerResult = "PENDING" | "SUCCEEDED";

// What this component shows — FAILED is added locally, once WE decide we've
// waited long enough.
type DisplayResult = ServerResult | "FAILED";

const POLL_INTERVAL_MS = 2000;

// How long THIS component keeps polling, timed from when it actually starts
// waiting (after the Stripe redirect), before giving up. Deliberately not
// timed from Stripe Checkout Session creation (see backend's doc comment) —
// time spent entering a card or completing a 3D Secure challenge on Stripe's
// own hosted page would otherwise already eat into the budget before this
// component even exists.
const CLIENT_TIMEOUT_MS = 90_000;

/**
 * Shown right after the Stripe Checkout redirect (?checkout=success&session_id=...
 * on the homepage, see CheckoutService.createCheckoutSessionUrl) while
 * lumo-payments-svc is still confirming whether the payment actually turned
 * into working Pro access — see that service's "Activation failures" README
 * section for why this can take a few seconds and isn't guaranteed to
 * succeed even though Stripe already took the money.
 *
 * Deliberately blocking with no way to dismiss while waiting — a user who
 * can wander off and start browsing mid-check has no way to be told the
 * outcome once it lands.
 */
export function CheckoutResultOverlay() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<DisplayResult | null>(null);

  const checkout = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");
  const active = checkout === "success" && !!sessionId;

  useEffect(() => {
    if (!active || !sessionId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const scheduleNextOrGiveUp = () => {
      if (cancelled) return;
      if (Date.now() - startedAt > CLIENT_TIMEOUT_MS) {
        setResult("FAILED");
        return;
      }
      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    };

    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/checkout-result?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });

        // A transient blip on our own proxy shouldn't flip the user straight
        // to "failed" — just keep waiting and try again.
        if (!response.ok) {
          scheduleNextOrGiveUp();
          return;
        }

        const data = (await response.json()) as { result: ServerResult };
        if (cancelled) return;

        if (data.result === "SUCCEEDED") {
          setResult("SUCCEEDED");
        } else {
          scheduleNextOrGiveUp();
        }
      } catch {
        scheduleNextOrGiveUp();
      }
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [active, sessionId]);

  if (!active) return null;

  const dismiss = () => router.replace("/", { scroll: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-surface p-8 text-center shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
        {result === null && (
          <>
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground" />
            <h2 className="text-xl font-bold text-foreground">{t("checkout.waitingTitle")}</h2>
            <p className="mt-3 text-sm text-foreground/60">{t("checkout.waitingDesc")}</p>
          </>
        )}

        {result === "SUCCEEDED" && (
          <>
            <h2 className="text-xl font-bold text-emerald-400">{t("checkout.successTitle")}</h2>
            <p className="mt-3 text-sm text-foreground/70">{t("checkout.successDesc")}</p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-6 w-full rounded-xl bg-linear-to-br from-[#6c5ce7] to-[#8e44ad] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            >
              {t("checkout.continue")}
            </button>
          </>
        )}

        {result === "FAILED" && (
          <>
            <h2 className="text-xl font-bold text-red-400">{t("checkout.failedTitle")}</h2>
            <p className="mt-3 text-sm text-foreground/70">{t("checkout.failedDesc")}</p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-6 w-full rounded-xl bg-linear-to-br from-[#6c5ce7] to-[#8e44ad] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            >
              {t("checkout.continue")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
