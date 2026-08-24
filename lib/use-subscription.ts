"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export type SubscriptionStatus =
  | "NONE"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "PAUSED";

export type Subscription = {
  plan: "FREE" | "PRO";
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

// Mirrors useCurrentUser's shape — the signed-in caller's own billing state
// (lumo-payments-svc, via app/api/payments/subscription), for the account
// subscription page to render.
export function useSubscription() {
  const { isLoaded, isSignedIn } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/payments/subscription", { cache: "no-store" });
      setSubscription(response.ok ? ((await response.json()) as Subscription) : null);
    } catch {
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { subscription, isLoading: !isLoaded || isLoading, refresh };
}
