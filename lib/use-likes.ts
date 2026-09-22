"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { type AddLikeResult, type LikedItem, getLikes, addLike, removeLike } from "@/lib/likes";

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
    async (item: LikedItem): Promise<AddLikeResult> => {
      if (!isSignedIn) return "error";
      const result = await addLike(item);
      if (result === "ok") await refresh();
      return result;
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

  // Matches on tmdbId as well as the stored recordId. They are the same
  // value for anything saved since the switch to TMDB-keyed records (see
  // lib/record-key.ts), but rows written before it still carry a table
  // uuid as their recordId — this keeps those recognised as already-saved
  // instead of silently offering to save them a second time, whether or
  // not the backfill migration has been run yet.
  const has = useCallback(
    (key: string) => (items ?? []).some((entry) => entry.id === key || (entry.tmdbId != null && entry.tmdbId === key)),
    [items]
  );

  return { items, isLoading: !isLoaded || items === null, add, remove, has };
}
