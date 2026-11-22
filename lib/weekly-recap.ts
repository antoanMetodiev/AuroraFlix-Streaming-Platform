import type { ProgressMap } from "@/lib/watch-progress";

/**
 * "Моята седмица" — a weekly recap built from the viewer's own watch
 * progress (lib/watch-progress.ts: this browser's, or the account's when
 * signed in). Everything is worked out from where each movie / episode was
 * left and when, so watch time is an estimate: the furthest point reached in
 * each one that week, not every minute in front of the screen.
 */
export type RecapTitle = {
  kind: "movie" | "tv";
  tmdbId: string;
  title: string;
  image: string | null;
  /** Episodes of it touched this week (1 for a movie). */
  episodes: number;
  seconds: number;
  lastAt: number;
};

export type WeeklyRecap = {
  start: Date;
  /** Exclusive. */
  end: Date;
  totalSeconds: number;
  movies: number;
  episodes: number;
  finished: number;
  titles: RecapTitle[];
  /** The series with the most episodes this week, if any had 2+. */
  topSeries: RecapTitle | null;
  first: RecapTitle | null;
  last: RecapTitle | null;
  /** 0 = Monday … 6 = Sunday, the day with the most watch time. */
  busiestDay: number | null;
  /** Watched something between midnight and 5 a.m. */
  nightOwl: boolean;
};

/** Monday 00:00 (local time) of the week `weeksAgo` weeks back. */
export function weekStart(weeksAgo = 0, now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - sinceMonday - weeksAgo * 7);
  return start;
}

export function weeklyRecap(map: ProgressMap, weeksAgo = 0, now = new Date()): WeeklyRecap {
  const start = weekStart(weeksAgo, now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const titles = new Map<string, RecapTitle>();
  const perDay = new Array<number>(7).fill(0);
  let totalSeconds = 0;
  let movies = 0;
  let episodes = 0;
  let finished = 0;
  let nightOwl = false;

  for (const [key, entry] of Object.entries(map)) {
    if (entry.updatedAt < start.getTime() || entry.updatedAt >= end.getTime()) continue;
    const [kind, tmdbId] = key.split(":") as ["movie" | "tv", string];
    const seconds = Math.max(0, entry.duration ? Math.min(entry.seconds, entry.duration) : entry.seconds);
    const at = new Date(entry.updatedAt);

    totalSeconds += seconds;
    perDay[(at.getDay() + 6) % 7] += seconds;
    if (at.getHours() < 5) nightOwl = true;
    if (entry.finished) finished++;
    if (kind === "movie") movies++;
    else episodes++;

    const titleKey = `${kind}:${tmdbId}`;
    const current = titles.get(titleKey);
    if (current) {
      current.episodes++;
      current.seconds += seconds;
      if (entry.updatedAt > current.lastAt) {
        current.lastAt = entry.updatedAt;
        current.title = entry.title ?? current.title;
        current.image = entry.image ?? current.image;
      }
    } else {
      titles.set(titleKey, {
        kind,
        tmdbId,
        title: entry.title ?? "",
        image: entry.image ?? null,
        episodes: 1,
        seconds,
        lastAt: entry.updatedAt,
      });
    }
  }

  const list = [...titles.values()].filter((title) => title.title).sort((a, b) => b.seconds - a.seconds);
  const byTime = [...list].sort((a, b) => a.lastAt - b.lastAt);
  const series = list.filter((title) => title.kind === "tv").sort((a, b) => b.episodes - a.episodes);
  const busiest = perDay.some((value) => value > 0) ? perDay.indexOf(Math.max(...perDay)) : null;

  return {
    start,
    end,
    totalSeconds,
    movies,
    episodes,
    finished,
    titles: list,
    topSeries: series[0] && series[0].episodes > 1 ? series[0] : null,
    first: byTime[0] ?? null,
    last: byTime[byTime.length - 1] ?? null,
    busiestDay: busiest,
    nightOwl,
  };
}
