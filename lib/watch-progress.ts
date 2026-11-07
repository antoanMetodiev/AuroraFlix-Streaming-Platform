"use client";

import { useSyncExternalStore } from "react";

/**
 * Where the viewer stopped in each movie / episode, kept in this browser's
 * localStorage. Positions change every few seconds and are only useful on the
 * device that's playing, so they don't go through lumo-user-svc for now.
 */

export type ProgressTarget =
  | { kind: "movie"; tmdbId: string }
  | { kind: "tv"; tmdbId: string; season: string; episode: string };

export type WatchProgress = {
  seconds: number;
  duration: number | null;
  finished: boolean;
  updatedAt: number;
  /** What the "continue watching" row shows, as the details page had it. */
  title?: string;
  image?: string;
};

export type ProgressMeta = { title?: string | null; image?: string | null };

export type ProgressMap = Record<string, WatchProgress>;

export type LatestProgress = WatchProgress & {
  season?: string;
  episode?: string;
};

export type ContinueWatchingEntry = LatestProgress & {
  kind: "movie" | "tv";
  tmdbId: string;
};

const STORAGE_KEY = "AURORAFLIX-WATCH-PROGRESS";
const CHANGE_EVENT = "auroraflix:watch-progress";
const MAX_ENTRIES = 300;
/** Below this it's only a look at the opening, or a player still restoring. */
const MIN_SAVED_SECONDS = 15;
/** Anything shorter is a pre-roll ad reporting its own clock, not the title. */
const MIN_DURATION_SECONDS = 120;
/** Past this share of the runtime only the credits are left. */
const FINISHED_RATIO = 0.93;
/** Jump back a little, so the viewer lands back inside the scene. */
const RESUME_REWIND_SECONDS = 5;

const EMPTY: ProgressMap = {};
let cache: ProgressMap | null = null;

export function progressKey(target: ProgressTarget) {
  return target.kind === "movie"
    ? `movie:${target.tmdbId}`
    : `tv:${target.tmdbId}:${target.season}:${target.episode}`;
}

function read(): ProgressMap {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as ProgressMap) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: ProgressMap) {
  const newest = Object.entries(next)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ENTRIES);
  cache = Object.fromEntries(newest);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: it still works until this page is closed.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveProgress(
  target: ProgressTarget,
  seconds: number,
  duration: number | null,
  meta?: ProgressMeta
) {
  if (!Number.isFinite(seconds) || seconds < MIN_SAVED_SECONDS) return;
  if (duration !== null && duration < MIN_DURATION_SECONDS) return;

  write({
    ...read(),
    [progressKey(target)]: {
      seconds,
      duration,
      finished: duration !== null && seconds / duration >= FINISHED_RATIO,
      updatedAt: Date.now(),
      ...(meta?.title ? { title: meta.title } : {}),
      ...(meta?.image ? { image: meta.image } : {}),
    },
  });
}

export function clearProgress(target: ProgressTarget) {
  const next = { ...read() };
  delete next[progressKey(target)];
  write(next);
}

/** Every saved position, right now (for code outside of rendering). */
export function getAllProgress(): ProgressMap {
  return read();
}

/** The second to start from, or null for "from the beginning". */
export function getResumeSeconds(target: ProgressTarget): number | null {
  const saved = read()[progressKey(target)];
  if (!saved || saved.finished) return null;
  return Math.max(0, Math.floor(saved.seconds) - RESUME_REWIND_SECONDS);
}

/** The most recent position in a movie, or in any episode of a series. */
export function latestProgress(
  map: ProgressMap,
  kind: "movie" | "tv",
  tmdbId: string
): LatestProgress | null {
  const prefix = `${kind}:${tmdbId}`;
  let latest: LatestProgress | null = null;

  for (const [key, entry] of Object.entries(map)) {
    if (key !== prefix && !key.startsWith(`${prefix}:`)) continue;
    if (latest && latest.updatedAt >= entry.updatedAt) continue;
    const [, , season, episode] = key.split(":");
    latest = { ...entry, season, episode };
  }

  return latest;
}

/**
 * One entry per title, newest first: the position it was last left at. A title
 * whose latest position is finished is done (a series opens on its next episode
 * by itself), so it isn't offered.
 */
export function continueWatching(map: ProgressMap): ContinueWatchingEntry[] {
  const latest = new Map<string, ContinueWatchingEntry>();

  for (const [key, entry] of Object.entries(map)) {
    const [kind, tmdbId, season, episode] = key.split(":");
    const titleKey = `${kind}:${tmdbId}`;
    const current = latest.get(titleKey);
    if (current && current.updatedAt >= entry.updatedAt) continue;
    latest.set(titleKey, { ...entry, kind: kind as "movie" | "tv", tmdbId, season, episode });
  }

  return [...latest.values()]
    .filter((entry) => !entry.finished)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Takes a title out of "continue watching". Finished episodes stay, so a series
 * keeps its "Watched" marks and still opens on the next one.
 */
export function dismissContinueWatching(kind: "movie" | "tv", tmdbId: string) {
  const prefix = `${kind}:${tmdbId}`;
  write(
    Object.fromEntries(
      Object.entries(read()).filter(
        ([key, entry]) => entry.finished || (key !== prefix && !key.startsWith(`${prefix}:`))
      )
    )
  );
}

/** 0-100 for a progress bar, or null when the runtime isn't known. */
export function progressPercent(entry: WatchProgress | null | undefined): number | null {
  if (!entry?.duration) return null;
  return Math.min(100, Math.max(0, (entry.seconds / entry.duration) * 100));
}

export function formatPlaybackTime(totalSeconds: number) {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = String(whole % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

function subscribe(onChange: () => void) {
  // Another tab wrote it: this tab's cached copy is out of date.
  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    onChange();
  }

  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

/** Every saved position. Empty during server render and hydration. */
export function useWatchProgress(): ProgressMap {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
