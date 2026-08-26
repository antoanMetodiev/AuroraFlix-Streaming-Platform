"use client";

import { useFriendRequestSocket } from "@/lib/use-friend-request-socket";
import { emitFriendsEvent } from "@/lib/friends-events";
import { emitWatchingEvent } from "@/lib/watching-events";

// The single owner of the friend-request WebSocket connection — see
// useFriendRequestSocket's doc comment for why there must be exactly one of
// these mounted (Navigation renders it once, alongside FriendsNavButton and
// NotificationsBell, both of which subscribe via lib/friends-events instead
// of opening their own connection). Renders nothing.
export function FriendsSocketManager() {
  useFriendRequestSocket(emitFriendsEvent, emitWatchingEvent);
  return null;
}
