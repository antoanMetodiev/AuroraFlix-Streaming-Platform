import type { WatchingTarget } from "@/lib/watching";

export type FriendWatchingPush = {
  clerkId: string;
  actorDisplayName: string | null;
  actorProfileImageURL: string | null;
  watching: WatchingTarget | null;
};

type Listener = (push: FriendWatchingPush) => void;

// Mirrors friends-events.ts's tiny module-level pub/sub exactly, kept as its
// own channel rather than reusing FriendsEventType's since these pushes
// carry a payload (who, watching what) instead of being a bare "something
// changed, go refetch" signal. FriendsSocketManager (the one place that owns
// the actual socket, see use-friend-request-socket.ts) calls
// emitWatchingEvent on every "friend_watching" message.
const listeners = new Set<Listener>();

export function emitWatchingEvent(push: FriendWatchingPush) {
  for (const listener of listeners) listener(push);
}

export function subscribeWatchingEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
