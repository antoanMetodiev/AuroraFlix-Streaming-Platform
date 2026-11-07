"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { extractProgress, isFromProvider, PROGRESS_ORIGIN } from "@/lib/player-telemetry";
import { setWatching, clearWatching, type WatchingTarget } from "@/lib/watching";

// Frequent on purpose (per the user's explicit call) so a friend's "watching"
// status is never more than a few seconds stale — lumo-user-svc's
// watching.Store ttl (90s) is well above this now, so a live tab refreshes
// its status many times before anything would expire; that ttl is purely the
// backstop for a tab that crashed/lost network and never got to send an
// explicit "stopped watching" at all.
const HEARTBEAT_MS = 5_000;

/** A player that stops moving its position this long is taken as paused. */
const STALLED_MS = 8_000;

/**
 * Best-effort "a friend is watching this" presence, pushed to lumo-user-svc
 * while a title's player is open — see PlayerSection, the one call site.
 *
 * With a player that reports its position (lib/player-telemetry.ts), it also
 * says where in the title the viewer is and whether they've paused: friends
 * see "minute 47, paused". The others (the БГ аудио players) report nothing,
 * so only "the player for X is open and this tab is visible" is known.
 *
 * Sends an immediate update on mount/target-change, a heartbeat every
 * HEARTBEAT_MS after (this is also what refreshes the backend TTL, so a
 * crashed tab's status still expires on its own even if the cleanup below
 * never runs), and clears outright once the tab is hidden or this unmounts.
 */
export function useWatchingPresence(target: WatchingTarget | null, provider: number) {
  const { isSignedIn } = useAuth();
  const targetRef = useRef(target);

  // Kept in sync via an effect (not a plain assignment in the render body)
  // so the ref write happens after render, not during it.
  useEffect(() => {
    targetRef.current = target;
  });

  useEffect(() => {
    if (!isSignedIn || !target) return;

    let position: number | undefined;
    let duration: number | undefined;
    let lastAdvanceAt = 0;
    let saidPaused = false;
    let saidPausedAt = 0;
    // VidFast and CineSrc can move on to the next episode inside the iframe.
    let episode: Pick<WatchingTarget, "season" | "episode"> = {};
    let lastSentPaused: boolean | undefined;

    const paused = () => {
      if (position === undefined) return undefined;
      if (saidPaused && saidPausedAt >= lastAdvanceAt) return true;
      return Date.now() - lastAdvanceAt > STALLED_MS;
    };

    const push = () => {
      if (document.hidden || !targetRef.current) return;
      lastSentPaused = paused();
      setWatching({
        ...targetRef.current,
        ...episode,
        position,
        duration,
        paused: lastSentPaused,
      });
    };

    function handleMessage(event: MessageEvent) {
      if (!PROGRESS_ORIGIN[provider] || !isFromProvider(provider, event)) return;
      const update = extractProgress(provider, event.data);
      if (!update) return;

      if (targetRef.current?.type === "series" && update.season !== undefined && update.episode !== undefined) {
        const next = { season: Number(update.season), episode: Number(update.episode) };
        if (next.season !== (episode.season ?? targetRef.current.season) || next.episode !== (episode.episode ?? targetRef.current.episode)) {
          episode = next;
          position = undefined;
          duration = undefined;
        }
      }
      if (update.duration !== undefined && update.duration > 0) duration = update.duration;
      if (update.currentTime !== undefined) {
        if (position === undefined || update.currentTime > position) lastAdvanceAt = Date.now();
        position = update.currentTime;
      }
      if (update.playing !== undefined) {
        saidPaused = !update.playing;
        saidPausedAt = Date.now();
      }

      // A pause or a resume is worth telling friends now, not at the next beat.
      if (position !== undefined && paused() !== lastSentPaused) push();
    }

    push();
    const interval = window.setInterval(push, HEARTBEAT_MS);
    window.addEventListener("message", handleMessage);

    const handleVisibility = () => {
      if (document.hidden) clearWatching();
      else push();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearWatching();
    };
    // Deliberately keyed on target's primitive fields, not its object
    // identity — the caller (PlayerSection) derives a fresh object every
    // render, which would otherwise restart this effect (and re-clear/re-push)
    // on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, provider, target?.tmdbId, target?.type, target?.title, target?.season, target?.episode]);
}
