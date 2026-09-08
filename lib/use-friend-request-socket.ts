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
 * There should be exactly one call site for this hook in the whole app (see
 * FriendsSocketManager): the gateway's Hub delivers each push to every
 * connection a user has, so extra sockets from the same tab wouldn't break
 * anything, they'd just each receive their own copy of every event for no
 * reason. Everything else that cares about these events subscribes to
 * lib/friends-events (or lib/watching-events, for "friend_watching")
 * instead of calling this hook again.
 */
export function useFriendRequestSocket(onEvent: (type: FriendsEventType) => void, onWatching: (push: FriendWatchingPush) => void) {
  const { isSignedIn, getToken } = useAuth();
  const callbackRef = useRef(onEvent);
  const watchingRef = useRef(onWatching);
  const getTokenRef = useRef(getToken);

  // Kept in sync via an effect (not a plain assignment in the render body)
  // so the "latest callback"/"latest getToken" ref writes happen after
  // render, not during it.
  //
  // getTokenRef specifically: Clerk's `getToken` from useAuth() isn't a
  // referentially stable function across every render, and it used to sit
  // directly in the reconnect effect's dependency array below — any
  // unrelated re-render that happened to produce a new `getToken` reference
  // tore the live socket down and reconnected it, with no replay for
  // whatever the server pushed during that gap. That's why a friend
  // starting to watch something only ever showed up right after a fresh
  // page load and stopped arriving afterwards. Routing it through a ref
  // (like callbackRef/watchingRef already do) keeps the connection itself
  // tied only to real sign-in/out, while `connect()` still always reads the
  // latest getToken when it actually needs a fresh token.
  useEffect(() => {
    callbackRef.current = onEvent;
    watchingRef.current = onWatching;
    getTokenRef.current = getToken;
  });

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let reconnectDelay = RECONNECT_START_MS;

    const connect = async () => {
      if (cancelled) return;

      const token = await getTokenRef.current();
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
  }, [isSignedIn]);
}
