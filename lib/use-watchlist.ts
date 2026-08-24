"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  type WatchlistItem,
  getLocalWatchlist,
  addToLocalWatchlist,
  removeFromLocalWatchlist,
  getServerWatchlist,
  addToServerWatchlist,
  removeFromServerWatchlist,
} from "@/lib/watchlist";

/**
 * Single watchlist API for the whole app — reads/writes localStorage when
 * signed out, and lumo-user-svc (via app/api/watchlist) when signed in.
 * Callers never branch on auth state themselves.
 */
export function useWatchlist() {
  const { isLoaded, isSignedIn } = useUser();
  const [items, setItems] = useState<WatchlistItem[] | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;
    setItems(isSignedIn ? await getServerWatchlist() : getLocalWatchlist());
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (item: WatchlistItem) => {
      if (isSignedIn) {
        await addToServerWatchlist(item);
      } else {
        addToLocalWatchlist(item);
      }
      await refresh();
    },
    [isSignedIn, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      if (isSignedIn) {
        await removeFromServerWatchlist(id);
      } else {
        removeFromLocalWatchlist(id);
      }
      await refresh();
    },
    [isSignedIn, refresh]
  );

  const has = useCallback((id: string) => (items ?? []).some((entry) => entry.id === id), [items]);

  return { items, isLoading: !isLoaded || items === null, add, remove, has };
}
