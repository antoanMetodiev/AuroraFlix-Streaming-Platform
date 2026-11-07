"use client";

import { useEffect, useRef, type RefObject } from "react";
import { extractProgress, isFromProvider, PROGRESS_ORIGIN } from "@/lib/player-telemetry";
import { saveProgress, type ProgressMeta, type ProgressTarget } from "@/lib/watch-progress";

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
  active: boolean,
  meta?: ProgressMeta
) {
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  });

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
      saveProgress(current, pendingSeconds, duration, metaRef.current);
      pendingSeconds = null;
      lastSaveAt = Date.now();
    }

    function handleMessage(event: MessageEvent) {
      if (!isFromProvider(provider, event)) return;
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

const ESTIMATE_TICK_SECONDS = 10;

/**
 * For players that report nothing (their iframe can't be looked into): counts
 * the time from the viewer's first click into the player, while this tab is
 * visible. A pause can't be seen from here, so it's only an estimate and is
 * saved as one. Starts from the position the viewer was told to skip to.
 */
export function useEstimatedProgressRecorder(
  target: ProgressTarget | null,
  active: boolean,
  startSeconds: number | null,
  frameRef: RefObject<HTMLIFrameElement | null>,
  meta?: ProgressMeta
) {
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  });

  useEffect(() => {
    if (!active || !target) return;

    let position = startSeconds ?? 0;
    let engaged = false;

    // A click into an iframe takes the focus away from this window.
    function handleBlur() {
      window.setTimeout(() => {
        if (document.activeElement === frameRef.current) engaged = true;
      });
    }

    const timer = window.setInterval(() => {
      if (document.activeElement === frameRef.current) engaged = true;
      if (!engaged || document.visibilityState !== "visible") return;
      position += ESTIMATE_TICK_SECONDS;
      saveProgress(target, position, null, { ...metaRef.current, approximate: true });
    }, ESTIMATE_TICK_SECONDS * 1000);

    window.addEventListener("blur", handleBlur);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("blur", handleBlur);
    };
  }, [target, active, startSeconds, frameRef]);
}
