"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { CurrentUser } from "@/lib/user-service";

/**
 * The signed-in caller's own lumo-user-svc record (plan, etc.), for client
 * components that need to know it — e.g. PricingSection deciding whether to
 * show "Upgrade to Pro" or "Current plan". Same shape as useWatchlist/
 * useLastViewed, just with no signed-out fallback data (there's nothing to
 * show for an anonymous visitor).
 */
export function useCurrentUser() {
  const { isLoaded, isSignedIn } = useUser();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/me", { cache: "no-store" });
      setUser(response.ok ? ((await response.json()) as CurrentUser | null) : null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { user, isLoading: !isLoaded || isLoading, refresh };
}
