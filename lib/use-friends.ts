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
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      setIsLoading(false);
      return;
    }

    try {
      const [friendsList, incomingList, outgoingList] = await Promise.all([getFriends(), getIncomingRequests(), getOutgoingRequests()]);
      setFriends(friendsList);
      setIncoming(incomingList);
      setOutgoing(outgoingList);
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
    isLoading: !isLoaded || isLoading,
    refresh,
    accept,
    cancelOrDecline,
    send,
    remove,
  };
}
