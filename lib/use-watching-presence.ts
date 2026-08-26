"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { setWatching, clearWatching, type WatchingTarget } from "@/lib/watching";

// Also lumo-user-svc's watching.Store TTL margin — see that package's doc
// comment for why 30s (one heartbeat every this often, expiring an entry
// that's missed three of them).
const HEARTBEAT_MS = 30_000;

/**
 * Best-effort "a friend is watching this" presence, pushed to lumo-user-svc
 * while a title's player is open — see PlayerSection, the one call site.
 *
 * This can only report "the player for X is open and this tab is visible,"
 * never real play/pause/progress: the video itself plays inside a
 * third-party iframe (vidsrc2.ru/vidfast.vc/cinesrc.st) this app doesn't
 * control and gets no postMessage events from. Same ceiling as Discord's
 * game presence — it doesn't know if you're mid-click either, just that the
 * process has focus.
 *
 * Sends an immediate update on mount/target-change, a heartbeat every
 * HEARTBEAT_MS after (this is also what refreshes the backend TTL, so a
 * crashed tab's status still expires on its own even if the cleanup below
 * never runs), and clears outright once the tab is hidden or this unmounts.
 */
export function useWatchingPresence(target: WatchingTarget | null) {
  const { isSignedIn } = useAuth();
  const targetRef = useRef(target);

  // Kept in sync via an effect (not a plain assignment in the render body)
  // so the ref write happens after render, not during it.
  useEffect(() => {
    targetRef.current = target;
  });

  useEffect(() => {
    if (!isSignedIn || !target) return;

    const push = () => {
      if (!document.hidden && targetRef.current) setWatching(targetRef.current);
    };

    push();
    const interval = window.setInterval(push, HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.hidden) clearWatching();
      else push();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearWatching();
    };
    // Deliberately keyed on target's primitive fields, not its object
    // identity — the caller (PlayerSection) derives a fresh object every
    // render, which would otherwise restart this effect (and re-clear/re-push)
    // on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, target?.tmdbId, target?.type, target?.title, target?.season, target?.episode]);
}
