// The last two carry no notification row behind them (see lumo-user-svc's
// friends.Service.pushAsync) — they exist purely to tell this tab that a
// request it's showing was withdrawn, or a friendship it's showing was ended,
// by the other person. Anything reacting to these has to re-read from the
// server rather than assume "a new notification arrived".
export type FriendsEventType =
  | "friend_request"
  | "friend_request_accepted"
  | "friend_request_declined"
  | "friend_request_canceled"
  | "friend_removed";

type Listener = (type: FriendsEventType) => void;

// Tiny module-level pub/sub so multiple components (FriendsNavButton's
// badge, NotificationsBell, useFriends' live lists) can all react to the
// same WebSocket message without each opening its own connection —
// FriendsSocketManager (mounted once from Navigation) is the single owner
// of the actual socket and calls emitFriendsEvent on every message. The
// gateway's hub fans a push out to every connection a user has (so a second
// tab is fine), but a socket per interested component within one tab would
// still be pure waste — one connection, many subscribers.
const listeners = new Set<Listener>();

export function emitFriendsEvent(type: FriendsEventType) {
  for (const listener of listeners) listener(type);
}

export function subscribeFriendsEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
