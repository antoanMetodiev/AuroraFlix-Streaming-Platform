"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  acceptFriendRequest,
  cancelOrDeclineRequest,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  removeFriend,
  sendFriendRequest,
  type Friend,
  type FriendRequestItem,
} from "@/lib/friends";
import { subscribeFriendsEvent } from "@/lib/friends-events";
import { getFriendsWatching, type WatchingTarget } from "@/lib/watching";
import { subscribeWatchingEvent } from "@/lib/watching-events";

// Backstop for the live WS push below — same idea as FriendsNavButton's own
// incoming-request poll. The push should be the one actually keeping this
// fresh in practice, but this hook is now consumed by components that stay
// mounted for a whole browsing session (the sidebar rail, the mobile pill),
// not just ones that re-fetch fresh every time they're opened (the friends
// panel) — so a missed/delayed push here doesn't mean "wrong until the next
// page load," just "wrong for up to this long."
const WATCHING_POLL_INTERVAL_MS = 5_000;

/**
 * Friends list + incoming/outgoing requests for the signed-in caller, same
 * shape as useCurrentUser/useWatchlist — no signed-out fallback data, since
 * there's nothing to show an anonymous visitor.
 */
export function useFriends() {
  const { isLoaded, isSignedIn } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [watching, setWatching] = useState<Record<string, WatchingTarget>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      setWatching({});
      setIsLoading(false);
      return;
    }

    try {
      const [friendsList, incomingList, outgoingList, watchingList] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
        getOutgoingRequests(),
        getFriendsWatching(),
      ]);
      setFriends(friendsList);
      setIncoming(incomingList);
      setOutgoing(outgoingList);
      setWatching(Object.fromEntries(watchingList.map((entry) => [entry.clerkId, entry.watching])));
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Both event types mean this data is now stale: a new incoming request
  // just landed, or one of ours (outgoing) just got accepted and belongs in
  // `friends` now — so a plain unconditional refresh covers either case
  // without needing to special-case which list actually changed.
  useEffect(() => {
    if (!isSignedIn) return;
    return subscribeFriendsEvent(() => refresh());
  }, [isSignedIn, refresh]);

  // Live "who's watching what" updates, applied in place rather than a full
  // refresh() — this fires far more often than a friend-request event
  // (every heartbeat's worth of change), so it only touches the one
  // clerkId's entry instead of re-fetching all four lists.
  useEffect(() => {
    if (!isSignedIn) return;
    return subscribeWatchingEvent(({ clerkId, watching: status }) => {
      setWatching((prev) => {
        if (status === null) {
          if (!(clerkId in prev)) return prev;
          const next = { ...prev };
          delete next[clerkId];
          return next;
        }
        return { ...prev, [clerkId]: status };
      });
    });
  }, [isSignedIn]);

  // Backstop poll — see WATCHING_POLL_INTERVAL_MS's doc comment above. A
  // full resnapshot (not a merge) so a friend who quietly expired without
  // ever sending an explicit "stopped" push (a crashed tab, lost network)
  // still gets cleared here even though no event ever arrived for them.
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = window.setInterval(async () => {
      const watchingList = await getFriendsWatching();
      setWatching(Object.fromEntries(watchingList.map((entry) => [entry.clerkId, entry.watching])));
    }, WATCHING_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isSignedIn]);

  const accept = useCallback(
    async (id: string) => {
      if (await acceptFriendRequest(id)) await refresh();
    },
    [refresh]
  );

  const cancelOrDecline = useCallback(
    async (id: string) => {
      if (await cancelOrDeclineRequest(id)) await refresh();
    },
    [refresh]
  );

  const send = useCallback(
    async (addresseeId: string) => {
      const ok = await sendFriendRequest(addresseeId);
      if (ok) await refresh();
      return ok;
    },
    [refresh]
  );

  const remove = useCallback(
    async (clerkId: string) => {
      if (await removeFriend(clerkId)) await refresh();
    },
    [refresh]
  );

  return {
    friends,
    incoming,
    outgoing,
    watching,
    isLoading: !isLoaded || isLoading,
    refresh,
    accept,
    cancelOrDecline,
    send,
    remove,
  };
}
