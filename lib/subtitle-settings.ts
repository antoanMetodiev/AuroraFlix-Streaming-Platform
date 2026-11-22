"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * How our own subtitle overlay (SubtitleOverlay) looks and how it's timed —
 * the viewer's choice, remembered in this browser and shared by every
 * player/tab on the site.
 */
export type SubtitleSize = "s" | "m" | "l" | "xl";
export type SubtitleColor = "white" | "yellow" | "cyan";
export type SubtitleBackground = "none" | "soft" | "solid";
export type SubtitlePosition = "bottom" | "raised";

export type SubtitleSettings = {
  size: SubtitleSize;
  color: SubtitleColor;
  background: SubtitleBackground;
  position: SubtitlePosition;
  /** Seconds the subtitles are shown later (+) or earlier (−) than the file says. */
  delay: number;
};

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  size: "m",
  color: "white",
  background: "soft",
  position: "bottom",
  delay: 0,
};

export const SUBTITLE_DELAY_STEP = 0.5;
export const SUBTITLE_DELAY_MAX = 15;

const KEY = "aurora-subtitle-settings";
const listeners = new Set<() => void>();
let cached: SubtitleSettings | null = null;

function read(): SubtitleSettings {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? { ...DEFAULT_SUBTITLE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SUBTITLE_SETTINGS;
  } catch {
    cached = DEFAULT_SUBTITLE_SETTINGS;
  }
  return cached!;
}

function write(next: SubtitleSettings) {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked — the choice lasts for this page only
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cached = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSubtitleSettings() {
  const settings = useSyncExternalStore(subscribe, read, () => DEFAULT_SUBTITLE_SETTINGS);
  const update = useCallback((patch: Partial<SubtitleSettings>) => write({ ...read(), ...patch }), []);
  const reset = useCallback(() => write(DEFAULT_SUBTITLE_SETTINGS), []);
  return { settings, update, reset };
}
