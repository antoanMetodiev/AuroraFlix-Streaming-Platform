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
  type SendRequestStatus,
} from "@/lib/friends";
import { subscribeFriendsEvent } from "@/lib/friends-events";
import { getFriendsWatching, type WatchingTarget } from "@/lib/watching";
import { subscribeWatchingEvent } from "@/lib/watching-events";

// Backstop for the live WS push below — the push should be the one actually
// keeping this fresh in practice, but this hook is consumed by components
// that stay mounted for a whole browsing session (the sidebar rail, the
// mobile pill), not just ones that re-fetch fresh every time they're opened
// (the friends panel) — so a missed/delayed push doesn't mean "wrong until
// the next page load," just "wrong for up to this long."
const WATCHING_POLL_INTERVAL_MS = 5_000;

// The same backstop for the friends/requests lists, which change far less
// often than "who's watching what" and so can afford a much lazier tick.
const LISTS_POLL_INTERVAL_MS = 30_000;

type FriendsSnapshot = {
  friends: Friend[];
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
  watching: Record<string, WatchingTarget>;
  isLoading: boolean;
};

const SIGNED_OUT: FriendsSnapshot = { friends: [], incoming: [], outgoing: [], watching: {}, isLoading: false };

/**
 * One shared store behind every useFriends() caller, rather than per-component
 * state.
 *
 * Six components use this hook (the panel, the nav button, the profile modal,
 * the watching rail, the mobile pill, the toast manager), and several of them
 * are mounted at once on a normal page. As per-component state, each one ran
 * its own copy of everything: four fetches on mount, its own 5-second watching
 * poll, and its own full refresh on every WS event — so a single friend
 * request arriving set off six identical rounds of four requests, and the
 * "who's watching" poll alone was issuing dozens of requests a minute against
 * one gateway instance. Worse than the volume, they drifted: each copy
 * answered its own fetch at its own time, so the nav badge, the panel and the
 * rail could disagree about the same list — the badge showing a pending
 * request the panel had already stopped listing.
 */
let snapshot: FriendsSnapshot = { ...SIGNED_OUT, isLoading: true };
const listeners = new Set<(next: FriendsSnapshot) => void>();

// Whether anyone is signed in, as last reported by a mounted hook. The store
// is module-level and can't call useUser() itself, so the hook feeds it in.
let isSignedIn = false;

// Shared in-flight refresh, so N components reacting to the same event (or
// mounting together) produce one round of fetches, not N. Callers await the
// same promise and all see the same result.
let inFlight: Promise<void> | null = null;

let watchingTimer: ReturnType<typeof setInterval> | undefined;
let listsTimer: ReturnType<typeof setInterval> | undefined;
let unsubscribeEvents: (() => void) | undefined;

function publish(patch: Partial<FriendsSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener(snapshot);
}

function toWatchingMap(entries: { clerkId: string; watching: WatchingTarget }[]) {
  return Object.fromEntries(entries.map((entry) => [entry.clerkId, entry.watching]));
}

async function refreshAll(): Promise<void> {
  if (!isSignedIn) {
    publish(SIGNED_OUT);
    return;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const [friends, incoming, outgoing, watchingList] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
        getOutgoingRequests(),
        getFriendsWatching(),
      ]);
      publish({ friends, incoming, outgoing, watching: toWatchingMap(watchingList), isLoading: false });
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

// A full resnapshot (not a merge) so a friend who quietly expired without ever
// sending an explicit "stopped" push (a crashed tab, lost network) still gets
// cleared even though no event ever arrived for them.
async function refreshWatching() {
  if (!isSignedIn) return;
  publish({ watching: toWatchingMap(await getFriendsWatching()) });
}

function start() {
  if (unsubscribeEvents) return;

  // Every friend event means at least one of these lists is now stale — a new
  // incoming request, one of ours accepted or declined, one withdrawn by its
  // sender, or a friendship ended by the other person — so an unconditional
  // refresh covers all of them without special-casing which list changed.
  const offFriends = subscribeFriendsEvent(() => refreshAll());

  // Applied in place rather than a full refresh: this fires far more often
  // than a friend-request event (every heartbeat's worth of change), so it
  // only touches the one clerkId's entry instead of re-fetching every list.
  const offWatching = subscribeWatchingEvent(({ clerkId, watching: status }) => {
    const prev = snapshot.watching;
    if (status === null) {
      if (!(clerkId in prev)) return;
      const next = { ...prev };
      delete next[clerkId];
      publish({ watching: next });
      return;
    }
    publish({ watching: { ...prev, [clerkId]: status } });
  });

  watchingTimer = setInterval(refreshWatching, WATCHING_POLL_INTERVAL_MS);
  listsTimer = setInterval(() => refreshAll(), LISTS_POLL_INTERVAL_MS);

  unsubscribeEvents = () => {
    offFriends();
    offWatching();
  };
}

function stop() {
  clearInterval(watchingTimer);
  clearInterval(listsTimer);
  watchingTimer = undefined;
  listsTimer = undefined;
  unsubscribeEvents?.();
  unsubscribeEvents = undefined;
}

/**
 * Friends list + incoming/outgoing requests + who's watching what, for the
 * signed-in caller. No signed-out fallback data, since there's nothing to show
 * an anonymous visitor.
 *
 * Every mutation refreshes unconditionally, including when the call failed:
 * a failure here almost always means the server already disagrees with what
 * we're showing (accepting a request the sender withdrew a moment ago 404s),
 * and that's exactly when re-reading matters most. Bailing out of the refresh
 * on failure left the stale row on screen — clicking Accept on a withdrawn
 * request did nothing at all, with nothing to show for it.
 */
export function useFriends() {
  const { isLoaded, isSignedIn: signedIn } = useUser();
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    const listener = (next: FriendsSnapshot) => setState(next);
    listeners.add(listener);
    start();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- catching up to a store another instance may have already filled
    setState(snapshot);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stop();
    };
  }, []);

  // The `isLoading` half of the condition matters for the signed-out case:
  // the store starts out both "loading" and "not signed in", so comparing
  // sign-in state alone would call nothing, and every consumer would sit on a
  // loading spinner forever for an anonymous visitor.
  useEffect(() => {
    if (!isLoaded) return;
    const next = signedIn === true;
    if (next === isSignedIn && !snapshot.isLoading) return;
    isSignedIn = next;
    refreshAll();
  }, [isLoaded, signedIn]);

  const refresh = useCallback(() => refreshAll(), []);

  const accept = useCallback(async (id: string) => {
    await acceptFriendRequest(id);
    await refreshAll();
  }, []);

  const cancelOrDecline = useCallback(async (id: string) => {
    await cancelOrDeclineRequest(id);
    await refreshAll();
  }, []);

  const send = useCallback(async (addresseeId: string): Promise<SendRequestStatus> => {
    const status = await sendFriendRequest(addresseeId);
    await refreshAll();
    return status;
  }, []);

  const remove = useCallback(async (clerkId: string) => {
    await removeFriend(clerkId);
    await refreshAll();
  }, []);

  return {
    friends: state.friends,
    incoming: state.incoming,
    outgoing: state.outgoing,
    watching: state.watching,
    isLoading: !isLoaded || state.isLoading,
    refresh,
    accept,
    cancelOrDecline,
    send,
    remove,
  };
}
