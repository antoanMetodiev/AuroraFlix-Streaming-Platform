"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createPlaylist, deletePlaylist, getPlaylists, updatePlaylist, type Playlist } from "@/lib/playlists";

// My own playlists — create/rename/toggle-visibility/delete. Item
// membership is managed separately per-playlist (see PlaylistCard), not
// loaded up front here, so opening the page doesn't fan out into N item
// requests before the user has expanded anything.
export function usePlaylists() {
  const { isLoaded, isSignedIn } = useUser();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setPlaylists([]);
      setIsLoading(false);
      return;
    }

    try {
      setPlaylists(await getPlaylists());
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string, isPublic: boolean) => {
      const created = await createPlaylist(name, isPublic);
      if (created) await refresh();
      return created;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, name: string, isPublic: boolean) => {
      const ok = await updatePlaylist(id, name, isPublic);
      if (ok) await refresh();
      return ok;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      if (await deletePlaylist(id)) await refresh();
    },
    [refresh]
  );

  return {
    playlists,
    isLoading: !isLoaded || isLoading,
    refresh,
    create,
    update,
    remove,
  };
}
