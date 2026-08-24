"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getLocalLastViewed,
  addLocalLastViewed,
  getServerLastViewed,
  addServerLastViewed,
} from "@/lib/last-viewed";
import type { LastViewed } from "@/types/last-viewed";

/**
 * Same shape as useWatchlist — localStorage when signed out, lumo-user-svc
 * (via app/api/last-viewed) when signed in. Callers never branch on auth state.
 */
export function useLastViewed() {
  const { isLoaded, isSignedIn } = useUser();
  const [items, setItems] = useState<LastViewed[] | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;
    setItems(isSignedIn ? await getServerLastViewed() : getLocalLastViewed());
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const record = useCallback(
    async (entry: LastViewed) => {
      if (isSignedIn) {
        await addServerLastViewed(entry);
      } else {
        addLocalLastViewed(entry);
      }
      await refresh();
    },
    [isSignedIn, refresh]
  );

  return { items, isLoading: !isLoaded || items === null, record };
}
