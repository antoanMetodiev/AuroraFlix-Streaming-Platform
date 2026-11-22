/**
 * Real watch time, for the weekly recap: how many seconds of each title were
 * actually played, per day and per hour of the day. Fed by saveProgress
 * (lib/watch-progress.ts): between two saves of the same movie / episode,
 * the position moving forward by about as much as the clock did counts as
 * watched; a jump (seeking ahead, a resume from another day) doesn't.
 *
 * Kept in this browser only, for the last LOG_DAYS days.
 */
export type DayLog = {
  /** Seconds per title ("movie:<id>" / "tv:<id>"). */
  t: Record<string, number>;
  /** Seconds per hour of the day ("0".."23"). */
  h: Record<string, number>;
};
export type WatchLog = Record<string, DayLog>;

const KEY = "AURORAFLIX-WATCH-LOG";
const LOG_DAYS = 70;
/** Saves further apart than this aren't one continuous viewing. */
const MAX_GAP_MS = 3 * 60_000;

const lastSave = new Map<string, { seconds: number; at: number }>();

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function readWatchLog(): WatchLog {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as WatchLog;
  } catch {
    return {};
  }
}

/** progressKey is "movie:<id>" or "tv:<id>:<season>:<episode>". */
export function recordWatchTime(progressKey: string, seconds: number) {
  if (typeof window === "undefined" || !Number.isFinite(seconds)) return;
  const now = Date.now();
  const previous = lastSave.get(progressKey);
  lastSave.set(progressKey, { seconds, at: now });
  if (!previous) return;

  const gapMs = now - previous.at;
  const advanced = seconds - previous.seconds;
  // Playing moves the position about as fast as the clock; allow some slack
  // for save timing, nothing for a seek.
  if (gapMs <= 0 || gapMs > MAX_GAP_MS || advanced <= 0 || advanced > gapMs / 1000 + 10) return;

  try {
    const log = readWatchLog();
    const date = new Date(now);
    const day = (log[dayKey(date)] ??= { t: {}, h: {} });
    const [kind, tmdbId] = progressKey.split(":");
    const titleKey = `${kind}:${tmdbId}`;
    day.t[titleKey] = (day.t[titleKey] ?? 0) + advanced;
    const hour = String(date.getHours());
    day.h[hour] = (day.h[hour] ?? 0) + advanced;

    const cutoff = dayKey(new Date(now - LOG_DAYS * 86_400_000));
    for (const key of Object.keys(log)) if (key < cutoff) delete log[key];
    window.localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // storage full or blocked — the recap falls back to its estimate
  }
}
