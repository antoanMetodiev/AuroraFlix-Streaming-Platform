import type { ProgressMap } from "@/lib/watch-progress";
import { dayKey, type WatchLog } from "@/lib/watch-log";

/**
 * "Моята седмица" — a weekly recap of the viewer's own watching.
 *
 * Two sources, the more exact one first:
 * - the watch log (lib/watch-log.ts): seconds actually played, per title,
 *   day and hour — kept by this browser from when it was added;
 * - watch progress (lib/watch-progress.ts): where each movie / episode was
 *   left and when. Used for titles the log doesn't have (watched on another
 *   device, or before the log existed), counting the furthest point reached.
 * `exactShare` says how much of the total came from the log.
 */
export type RecapEpisode = { season: number; episode: number; finished: boolean; percent: number | null };

export type RecapTitle = {
  kind: "movie" | "tv";
  tmdbId: string;
  title: string;
  image: string | null;
  seconds: number;
  /** Series: the episodes touched this week, in order. */
  episodes: RecapEpisode[];
  /** Movie: how far, 0–100 (null when the runtime is unknown). */
  percent: number | null;
  finished: boolean;
  lastAt: number;
  firstAt: number;
};

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type WeeklyRecap = {
  start: Date;
  /** Exclusive. */
  end: Date;
  totalSeconds: number;
  /** 0–1: share of totalSeconds measured by the watch log, the rest estimated. */
  exactShare: number;
  /** Monday … Sunday. */
  perDay: number[];
  timeOfDay: Record<TimeOfDay, number>;
  activeDays: number;
  /** Longest run of consecutive days with something watched. */
  streak: number;
  movies: RecapTitle[];
  series: RecapTitle[];
  /** Everything, most watched first. */
  titles: RecapTitle[];
  episodesWatched: number;
  episodesFinished: number;
  moviesFinished: number;
  /** Left unfinished, most recent first. */
  inProgress: RecapTitle[];
  first: RecapTitle | null;
  last: RecapTitle | null;
  busiestDay: number | null;
  nightOwl: boolean;
};

/** Monday 00:00 (local time) of the week `weeksAgo` weeks back. */
export function weekStart(weeksAgo = 0, now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - sinceMonday - weeksAgo * 7);
  return start;
}

function timeOfDayFor(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

export function weeklyRecap(map: ProgressMap, log: WatchLog, weeksAgo = 0, now = new Date()): WeeklyRecap {
  const start = weekStart(weeksAgo, now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });

  // --- the log: exact seconds per title / day / hour ---
  const loggedPerTitle = new Map<string, number>();
  const perDay = new Array<number>(7).fill(0);
  const timeOfDay: Record<TimeOfDay, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let nightOwl = false;
  days.forEach((key, i) => {
    const day = log[key];
    if (!day) return;
    for (const [title, seconds] of Object.entries(day.t)) {
      loggedPerTitle.set(title, (loggedPerTitle.get(title) ?? 0) + seconds);
      perDay[i] += seconds;
    }
    for (const [hour, seconds] of Object.entries(day.h)) {
      timeOfDay[timeOfDayFor(Number(hour))] += seconds;
      if (Number(hour) < 5 && seconds > 60) nightOwl = true;
    }
  });

  // --- progress: what was touched this week, and how far ---
  const titles = new Map<string, RecapTitle>();
  const estimated = new Map<string, { seconds: number; at: number[] }>();
  for (const [key, entry] of Object.entries(map)) {
    if (entry.updatedAt < start.getTime() || entry.updatedAt >= end.getTime()) continue;
    const [kind, tmdbId, season, episode] = key.split(":") as ["movie" | "tv", string, string?, string?];
    const titleKey = `${kind}:${tmdbId}`;
    const seconds = Math.max(0, entry.duration ? Math.min(entry.seconds, entry.duration) : entry.seconds);
    const percent = entry.duration ? Math.min(100, Math.round((entry.seconds / entry.duration) * 100)) : null;

    const est = estimated.get(titleKey) ?? { seconds: 0, at: [] };
    est.seconds += seconds;
    est.at.push(entry.updatedAt);
    estimated.set(titleKey, est);

    let title = titles.get(titleKey);
    if (!title) {
      title = {
        kind,
        tmdbId,
        title: entry.title ?? "",
        image: entry.image ?? null,
        seconds: 0,
        episodes: [],
        percent: null,
        finished: false,
        lastAt: entry.updatedAt,
        firstAt: entry.updatedAt,
      };
      titles.set(titleKey, title);
    }
    if (entry.updatedAt >= title.lastAt) {
      title.lastAt = entry.updatedAt;
      if (entry.title) title.title = entry.title;
      if (entry.image) title.image = entry.image;
    }
    title.firstAt = Math.min(title.firstAt, entry.updatedAt);
    if (kind === "tv") {
      title.episodes.push({ season: Number(season), episode: Number(episode), finished: entry.finished, percent });
    } else {
      title.percent = percent;
      title.finished = entry.finished;
    }
  }

  // Seconds per title: the log where it has it, otherwise the estimate (and
  // then its days / hours come from when it was last saved).
  let total = 0;
  let exact = 0;
  for (const [titleKey, title] of titles) {
    const logged = loggedPerTitle.get(titleKey);
    if (logged && logged > 0) {
      title.seconds = logged;
      exact += logged;
    } else {
      const est = estimated.get(titleKey)!;
      title.seconds = est.seconds;
      const share = est.seconds / est.at.length;
      for (const at of est.at) {
        const date = new Date(at);
        perDay[(date.getDay() + 6) % 7] += share;
        timeOfDay[timeOfDayFor(date.getHours())] += share;
        if (date.getHours() < 5) nightOwl = true;
      }
    }
    total += title.seconds;
    if (title.kind === "tv") {
      title.episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);
      title.finished = title.episodes.every((e) => e.finished);
    }
  }

  const list = [...titles.values()].filter((title) => title.title).sort((a, b) => b.seconds - a.seconds);
  const byTime = [...list].sort((a, b) => a.firstAt - b.firstAt);
  const movies = list.filter((title) => title.kind === "movie");
  const series = list.filter((title) => title.kind === "tv").sort((a, b) => b.episodes.length - a.episodes.length || b.seconds - a.seconds);

  let streak = 0;
  let run = 0;
  for (const seconds of perDay) {
    run = seconds > 0 ? run + 1 : 0;
    streak = Math.max(streak, run);
  }

  return {
    start,
    end,
    totalSeconds: total,
    exactShare: total > 0 ? exact / total : 0,
    perDay,
    timeOfDay,
    activeDays: perDay.filter((seconds) => seconds > 0).length,
    streak,
    movies,
    series,
    titles: list,
    episodesWatched: series.reduce((sum, s) => sum + s.episodes.length, 0),
    episodesFinished: series.reduce((sum, s) => sum + s.episodes.filter((e) => e.finished).length, 0),
    moviesFinished: movies.filter((m) => m.finished).length,
    inProgress: list.filter((title) => !title.finished).sort((a, b) => b.lastAt - a.lastAt),
    first: byTime[0] ?? null,
    last: byTime[byTime.length - 1] ?? null,
    busiestDay: perDay.some((value) => value > 0) ? perDay.indexOf(Math.max(...perDay)) : null,
    nightOwl,
  };
}
