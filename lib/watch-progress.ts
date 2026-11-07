"use client";

import { useSyncExternalStore } from "react";

/**
 * Where the viewer stopped in each movie / episode. Signed out it's kept in
 * this browser's localStorage; signed in it belongs to the account
 * (lumo-user-svc through app/api/watch-progress) and follows it to every
 * device. The two never mix: signing in neither copies the browser's
 * positions to the account nor touches them, and signing out shows them
 * again as they were. <WatchProgressAccount> says which one is in use.
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
  /** Counted by us, the player doesn't report its position: see useEstimatedProgressRecorder. */
  approximate?: boolean;
};

export type ProgressMeta = { title?: string | null; image?: string | null; approximate?: boolean };

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
/** Coming back to a tab refreshes the account's positions, at most this often. */
const RELOAD_AFTER_MS = 30_000;

const EMPTY: ProgressMap = {};
/** This browser's positions, as last read from localStorage. */
let cache: ProgressMap | null = null;

/**
 * Whose positions: undefined until sign-in is known, null for this browser's,
 * otherwise the signed-in user's id.
 */
let account: string | null | undefined;
/** The account's positions; null while they load. */
let accountMap: ProgressMap | null = null;
/** Saved while the account's positions were loading: they win over what loads. */
let earlyWrites: ProgressMap = {};
/** Changes made before sign-in was known, replayed once it is. */
let pending: Array<() => void> = [];
let lastLoad = 0;

export function progressKey(target: ProgressTarget) {
  return target.kind === "movie"
    ? `movie:${target.tmdbId}`
    : `tv:${target.tmdbId}:${target.season}:${target.episode}`;
}

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function read(): ProgressMap {
  if (account === undefined) return EMPTY;
  if (account !== null) return accountMap ?? earlyWrites;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as ProgressMap) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

/**
 * What's stored right now. Another tab may have saved since this one last read,
 * and writing from the cached copy would wipe what it saved.
 */
function readFresh(): ProgressMap {
  cache = null;
  return read();
}

function newest(map: ProgressMap): ProgressMap {
  return Object.fromEntries(
    Object.entries(map)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ENTRIES)
  );
}

/** Signed out: the whole map goes back into localStorage. */
function writeLocal(next: ProgressMap) {
  cache = newest(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: it still works until this page is closed.
  }
  emitChange();
}

// --- Signed in: the account's positions, kept here and sent one by one. ---

type ServerEntry = WatchProgress & { key: string };

function sendToAccount(query: string, init: RequestInit) {
  // keepalive: the last save comes as the page is being closed.
  fetch(`/api/watch-progress${query}`, { ...init, keepalive: true }).catch(() => {});
}

function saveToAccount(key: string, entry: WatchProgress) {
  if (accountMap) accountMap = newest({ ...accountMap, [key]: entry });
  else earlyWrites = { ...earlyWrites, [key]: entry };
  emitChange();
  sendToAccount("", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, ...entry }),
  });
}

function removeFromAccount(keys: string[]) {
  if (keys.length === 0) return;
  const without = (map: ProgressMap) =>
    Object.fromEntries(Object.entries(map).filter(([key]) => !keys.includes(key)));
  if (accountMap) accountMap = without(accountMap);
  earlyWrites = without(earlyWrites);
  emitChange();
  // A long series' worth of keys, a URL at a time.
  for (let i = 0; i < keys.length; i += 100) {
    const query = keys
      .slice(i, i + 100)
      .map((key) => `key=${encodeURIComponent(key)}`)
      .join("&");
    sendToAccount(`?${query}`, { method: "DELETE" });
  }
}

async function loadAccount(userId: string) {
  lastLoad = Date.now();
  try {
    const response = await fetch("/api/watch-progress", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const entries = (await response.json()) as ServerEntry[];
    if (account !== userId) return;
    const loaded: ProgressMap = {};
    for (const { key, ...entry } of entries) loaded[key] = entry;
    accountMap = newest({ ...loaded, ...earlyWrites });
    earlyWrites = {};
  } catch {
    if (account !== userId || accountMap) return;
    // Nothing to resume from, but this page's own saves still go through.
    accountMap = earlyWrites;
    earlyWrites = {};
  }
  emitChange();
}

/**
 * Which positions are in use: the signed-in user's (their id), or this
 * browser's (null). Set by <WatchProgressAccount> once sign-in is known.
 */
export function setProgressAccount(userId: string | null) {
  if (account === userId) return;
  account = userId;
  accountMap = null;
  earlyWrites = {};
  cache = null;
  if (userId !== null) void loadAccount(userId);
  const replay = pending;
  pending = [];
  replay.forEach((run) => run());
  emitChange();
}

/** Back on a tab: what other tabs and devices saved meanwhile. */
export function refreshAccountProgress() {
  if (typeof account === "string" && Date.now() - lastLoad > RELOAD_AFTER_MS) {
    void loadAccount(account);
  }
}

/** Before sign-in is known, a change waits for it. */
function whenKnown(run: () => void) {
  if (account === undefined) pending.push(run);
  else run();
}

function isReady() {
  return account === null || (account !== undefined && accountMap !== null);
}

export function saveProgress(
  target: ProgressTarget,
  seconds: number,
  duration: number | null,
  meta?: ProgressMeta
) {
  if (!Number.isFinite(seconds) || seconds < MIN_SAVED_SECONDS) return;
  if (duration !== null && duration < MIN_DURATION_SECONDS) return;

  const updatedAt = Date.now();
  whenKnown(() => {
    const saved = readFresh();
    const key = progressKey(target);
    // Some players say the runtime only once, as they load.
    const knownDuration = duration ?? saved[key]?.duration ?? null;
    const entry: WatchProgress = {
      seconds,
      duration: knownDuration,
      finished: knownDuration !== null && seconds / knownDuration >= FINISHED_RATIO,
      updatedAt,
      ...(meta?.title ? { title: meta.title } : {}),
      ...(meta?.image ? { image: meta.image } : {}),
      ...(meta?.approximate ? { approximate: true } : {}),
    };

    if (account) saveToAccount(key, entry);
    else writeLocal({ ...saved, [key]: entry });
  });
}

export function clearProgress(target: ProgressTarget) {
  whenKnown(() => {
    const key = progressKey(target);
    if (account) {
      removeFromAccount([key]);
      return;
    }
    const next = { ...readFresh() };
    delete next[key];
    writeLocal(next);
  });
}

/** Every saved position, right now (for code outside of rendering). */
export function getAllProgress(): ProgressMap {
  return readFresh();
}

/** The second to start from, or null for "from the beginning". */
export function getResumeSeconds(target: ProgressTarget): number | null {
  const saved = readFresh()[progressKey(target)];
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
  whenKnown(() => {
    const saved = readFresh();
    const dismissed = Object.keys(saved).filter(
      (key) => !saved[key].finished && (key === prefix || key.startsWith(`${prefix}:`))
    );
    if (account) {
      removeFromAccount(dismissed);
      return;
    }
    writeLocal(Object.fromEntries(Object.entries(saved).filter(([key]) => !dismissed.includes(key))));
  });
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
  // Another tab wrote this browser's positions: the cached copy is out of date.
  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY || account !== null) return;
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

/**
 * Whether the saved positions can be read yet: right away signed out, once the
 * account's have loaded signed in. Until then there is nothing to resume from.
 */
export function useWatchProgressReady(): boolean {
  return useSyncExternalStore(subscribe, isReady, () => false);
}
