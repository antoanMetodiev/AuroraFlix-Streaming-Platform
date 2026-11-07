"use client";

import { useEffect } from "react";
import { extractProgress, PROGRESS_ORIGIN } from "@/lib/player-telemetry";
import { saveProgress, type ProgressTarget } from "@/lib/watch-progress";

const SAVE_EVERY_MS = 10_000;
/** A bigger runtime change on a series means the player moved to another episode. */
const EPISODE_DURATION_TOLERANCE_SECONDS = 120;

/**
 * Saves the position the active player reports. Players with no known
 * telemetry (see PROGRESS_ORIGIN) simply save nothing.
 */
export function useWatchProgressRecorder(
  target: ProgressTarget | null,
  provider: number,
  active: boolean
) {
  useEffect(() => {
    const expectedOrigin = PROGRESS_ORIGIN[provider];
    if (!active || !target || !expectedOrigin) return;

    let current: ProgressTarget = target;
    let duration: number | null = null;
    let lockedDuration: number | null = null;
    let lost = false;
    let pendingSeconds: number | null = null;
    let lastSaveAt = 0;

    function flush() {
      if (pendingSeconds === null) return;
      saveProgress(current, pendingSeconds, duration);
      pendingSeconds = null;
      lastSaveAt = Date.now();
    }

    function handleMessage(event: MessageEvent) {
      if (event.origin !== expectedOrigin) return;
      const update = extractProgress(provider, event.data);
      if (!update) return;

      // VidFast and CineSrc can advance to the next episode inside the iframe.
      if (
        current.kind === "tv" &&
        update.season !== undefined &&
        update.episode !== undefined &&
        (String(update.season) !== current.season || String(update.episode) !== current.episode)
      ) {
        flush();
        current = {
          ...current,
          season: String(update.season),
          episode: String(update.episode),
        };
        duration = null;
        lockedDuration = null;
        lost = false;
      }

      if (update.duration !== undefined) {
        duration = update.duration;
        // Without an episode number in the messages, a different runtime is
        // the only sign of a new episode. Better to stop than to save its
        // position under the previous one.
        if (current.kind === "tv" && duration >= 120) {
          if (lockedDuration === null) {
            lockedDuration = duration;
          } else if (Math.abs(duration - lockedDuration) > EPISODE_DURATION_TOLERANCE_SECONDS) {
            lost = true;
            pendingSeconds = null;
          }
        }
      }

      if (lost || update.currentTime === undefined) return;

      pendingSeconds = update.currentTime;
      if (Date.now() - lastSaveAt >= SAVE_EVERY_MS) flush();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("message", handleMessage);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      flush();
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [target, provider, active]);
}
