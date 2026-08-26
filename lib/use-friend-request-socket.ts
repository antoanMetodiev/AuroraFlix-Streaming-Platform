"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { WS_BASE_URL } from "@/lib/config";
import type { FriendsEventType } from "@/lib/friends-events";
import type { FriendWatchingPush } from "@/lib/watching-events";
import type { WatchingTarget } from "@/lib/watching";

// Exponential backoff instead of a flat delay — the first retry after a
// drop is near-instant, later ones back off in case the gateway is
// genuinely down rather than just mid-restart (e.g. a local `air` rebuild
// while developing, which kills every live connection on every .go save).
const RECONNECT_START_MS = 300;
const RECONNECT_MAX_MS = 8000;

// "friend_watching" is payload-bearing (who, watching what or null to mean
// "stopped") unlike the bare FriendsEventType messages — see
// lumo-user-svc's internal/watching for the push's origin. actorDisplayName/
// actorProfileImageURL travel with every push (not just looked up from a
// separately-fetched friends list) so a UI reacting to this live push never
// has to race that list's own fetch just to render a name/avatar.
type WSMessage =
  | { type: FriendsEventType }
  | {
      type: "friend_watching";
      clerkId: string;
      actorDisplayName: string | null;
      actorProfileImageURL: string | null;
      watching: WatchingTarget | null;
    };

/**
 * Direct browser-to-gateway WebSocket for instant friend-request pushes
 * (new request received, or a sent request getting accepted — see
 * lumo-api-gateway's internal/wsnotify; its connections live in that one
 * gateway instance's memory for now, per the user's explicit call, until
 * it's worth moving to Redis or similar). This is the one connection in the
 * app that can't go through my-app's own same-origin API proxy the way
 * every other authenticated call does (see app/api/backend's doc comment)
 * — a WS handshake is a persistent connection, not a single request/response
 * a Next.js route handler can forward, so this really does call the gateway
 * directly from the browser.
 *
 * There must be exactly one call site for this hook in the whole app (see
 * FriendsSocketManager) — the gateway's Hub keeps only one live connection
 * per clerkId, so a second one from the same tab would evict the first.
 * Everything else that cares about these events subscribes to
 * lib/friends-events (or lib/watching-events, for "friend_watching")
 * instead of calling this hook again.
 */
export function useFriendRequestSocket(onEvent: (type: FriendsEventType) => void, onWatching: (push: FriendWatchingPush) => void) {
  const { isSignedIn, getToken } = useAuth();
  const callbackRef = useRef(onEvent);
  const watchingRef = useRef(onWatching);

  // Kept in sync via an effect (not a plain assignment in the render body)
  // so the "latest callback" ref write happens after render, not during it.
  useEffect(() => {
    callbackRef.current = onEvent;
    watchingRef.current = onWatching;
  });

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let reconnectDelay = RECONNECT_START_MS;

    const connect = async () => {
      if (cancelled) return;

      const token = await getToken();
      if (!token || cancelled) return;

      socket = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);

      socket.onopen = () => {
        // A real, sustained connection means the gateway is genuinely up —
        // reset the backoff so the *next* drop starts fast again too.
        reconnectDelay = RECONNECT_START_MS;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WSMessage;
          if (data.type === "friend_watching") {
            watchingRef.current({
              clerkId: data.clerkId,
              actorDisplayName: data.actorDisplayName,
              actorProfileImageURL: data.actorProfileImageURL,
              watching: data.watching,
            });
          } else {
            callbackRef.current(data.type);
          }
        } catch {
          // malformed payload — ignore
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectTimeout = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
      };

      socket.onerror = () => socket?.close();
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimeout);
      socket?.close();
    };
  }, [isSignedIn, getToken]);
}
