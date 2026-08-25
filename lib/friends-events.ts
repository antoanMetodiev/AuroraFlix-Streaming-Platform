export type FriendsEventType = "friend_request" | "friend_request_accepted" | "friend_request_declined";

type Listener = (type: FriendsEventType) => void;

// Tiny module-level pub/sub so multiple components (FriendsNavButton's
// badge, NotificationsBell, useFriends' live lists) can all react to the
// same WebSocket message without each opening its own connection —
// FriendsSocketManager (mounted once from Navigation) is the single owner
// of the actual socket and calls emitFriendsEvent on every message. The
// gateway's wsnotify.Hub only keeps one live connection per clerkId, so a
// second connection from the same browser tab would silently evict the
// first — this is what keeps it to exactly one.
const listeners = new Set<Listener>();

export function emitFriendsEvent(type: FriendsEventType) {
  for (const listener of listeners) listener(type);
}

export function subscribeFriendsEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
