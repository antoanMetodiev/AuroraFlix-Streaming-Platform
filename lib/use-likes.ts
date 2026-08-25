"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { type LikedItem, getLikes, addLike, removeLike } from "@/lib/likes";

/**
 * Single likes API for the whole app — signed-in only (see lib/likes.ts),
 * same shape as useWatchlist otherwise so callers don't have to think about
 * loading/auth state themselves.
 */
export function useLikes() {
  const { isLoaded, isSignedIn } = useUser();
  const [items, setItems] = useState<LikedItem[] | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;
    setItems(isSignedIn ? await getLikes() : []);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (item: LikedItem) => {
      if (!isSignedIn) return;
      await addLike(item);
      await refresh();
    },
    [isSignedIn, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!isSignedIn) return;
      await removeLike(id);
      await refresh();
    },
    [isSignedIn, refresh]
  );

  const has = useCallback((id: string) => (items ?? []).some((entry) => entry.id === id), [items]);

  return { items, isLoading: !isLoaded || items === null, add, remove, has };
}
