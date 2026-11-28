"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Clapperboard, Flame, Moon, Play, Share2, Star } from "lucide-react";
import { EmptyIllustration } from "@/components/ui/empty-illustration";
import { Loader } from "@/components/ui/loader";
import { RecapShareSheet } from "@/components/recap/recap-share-sheet";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { getMovieSlug, tmdbImage } from "@/lib/tmdb";
import { readWatchLog } from "@/lib/watch-log";
import { useWatchProgress, useWatchProgressReady } from "@/lib/watch-progress";
import { weeklyRecap, type RecapTitle, type TimeOfDay, type WeeklyRecap } from "@/lib/weekly-recap";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const SLIDE_MS = 7000;
const TIMES_OF_DAY: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

type Preview = Movie | Series;
type T = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function keyOf(title: RecapTitle) {
  return `${title.kind}:${title.tmdbId}`;
}

function hrefFor(title: RecapTitle) {
  return title.kind === "tv" ? `/series/${title.tmdbId}` : `/movies/${getMovieSlug({ title: title.title, tmdbId: title.tmdbId })}`;
}

function formatTime(seconds: number, t: T) {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return t("recap.minutes", { m: totalMinutes });
  return t("recap.hours", { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 });
}

/** Catalog details (poster, genres, rating, year, description) for the week's top titles. */
function usePreviews(recap: WeeklyRecap | null) {
  const [previews, setPreviews] = useState<Map<string, Preview>>(new Map());
  useEffect(() => {
    if (!recap || recap.titles.length === 0) return;
    let cancelled = false;
    const top = recap.titles.slice(0, 10);
    Promise.all(top.map((title) => (title.kind === "movie" ? getMoviePreview(title.tmdbId) : getSeriesPreview(title.tmdbId)).catch(() => null))).then(
      (results) => {
        if (cancelled) return;
        const next = new Map<string, Preview>();
        results.forEach((preview, i) => preview && next.set(keyOf(top[i]), preview));
        setPreviews(next);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [recap]);
  return previews;
}

export function WeeklyRecapView() {
  const { t, locale } = useTranslation();
  const progress = useWatchProgress();
  const ready = useWatchProgressReady();
  const [weeksAgo, setWeeksAgo] = useState(0);
  const { recap, previousTotal } = useMemo(() => {
    if (!ready) return { recap: null, previousTotal: 0 };
    const log = readWatchLog();
    return { recap: weeklyRecap(progress, log, weeksAgo), previousTotal: weeklyRecap(progress, log, weeksAgo + 1).totalSeconds };
  }, [progress, ready, weeksAgo]);
  const previews = usePreviews(recap);

  const range = useMemo(() => {
    if (!recap) return "";
    const last = new Date(recap.end.getTime() - 1);
    const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
    return `${format.format(recap.start)} – ${format.format(last)}`;
  }, [recap, locale]);

  return (
    <div className="relative flex-1 w-full overflow-x-hidden">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-10 pb-24 sm:pt-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{t("recap.title")}</h1>
        <div className="mt-5 flex gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {[0, 1].map((ago) => (
            <button
              key={ago}
              type="button"
              onClick={() => setWeeksAgo(ago)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${weeksAgo === ago ? "bg-white text-neutral-900" : "text-foreground/65 hover:text-foreground"}`}
            >
              {t(ago === 0 ? "recap.thisWeek" : "recap.lastWeek")}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-foreground/50">{range}</p>

        <div className="mt-8 w-full">
          {!recap ? (
            <Loader />
          ) : recap.titles.length === 0 ? (
            <div className="animate-card-in flex flex-col items-center text-center">
              <EmptyIllustration kind="watchlist" className="h-32 w-44" />
              <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">{t("recap.emptyTitle")}</h2>
              <p className="mt-2 max-w-sm text-sm text-foreground/55">{t("recap.emptyDesc")}</p>
              <Link
                href="/movies"
                className="mt-6 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5"
              >
                <Clapperboard size={15} />
                {t("watchlist.browseMovies")}
              </Link>
            </div>
          ) : (
            <RecapStory key={weeksAgo} recap={recap} previousTotal={previousTotal} previews={previews} range={range} />
          )}
        </div>
      </div>
    </div>
  );
}

function Poster({ src, alt, className = "" }: { src: string | null | undefined; alt: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/15 ${className}`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- already-sized TMDB images
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function Bar({ value, max, className = "bg-white" }: { value: number; max: number; className?: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-white/15">
      <span className={`block h-full rounded-full ${className}`} style={{ width: `${max > 0 && value > 0 ? Math.max(3, (value / max) * 100) : 0}%` }} />
    </span>
  );
}

function RecapStory({
  recap,
  previousTotal,
  previews,
  range,
}: {
  recap: WeeklyRecap;
  previousTotal: number;
  previews: Map<string, Preview>;
  range: string;
}) {
  const { t, locale, genre: genreName } = useTranslation();
  const [index, setIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const captureCard = useCallback(() => cardRef.current, []);

  const posterOf = (title: RecapTitle) => tmdbImage(previews.get(keyOf(title))?.posterImgURL, "w342") ?? title.image;
  const dayName = (i: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(recap.start.getTime() + i * 86_400_000 + 43_200_000));
  const dayShort = (i: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(recap.start.getTime() + i * 86_400_000 + 43_200_000));

  const timeText = formatTime(recap.totalSeconds, t);
  const change = previousTotal > 0 ? Math.round(((recap.totalSeconds - previousTotal) / previousTotal) * 100) : null;
  const changeText =
    change === null ? t("recap.vsNew") : Math.abs(change) < 5 ? t("recap.vsSame") : t(change > 0 ? "recap.vsUp" : "recap.vsDown", { p: Math.abs(change) });
  const sourceNote = recap.exactShare >= 0.95 ? t("recap.exactNote") : recap.exactShare > 0 ? t("recap.mixedNote") : t("recap.estimate");
  const maxDay = Math.max(...recap.perDay);

  // Genres weighted by watch time, from the catalog previews.
  const genres = (() => {
    const weight = new Map<string, number>();
    for (const title of recap.titles) {
      const preview = previews.get(keyOf(title));
      for (const g of (preview?.genres ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
        weight.set(g, (weight.get(g) ?? 0) + title.seconds + 1);
      }
    }
    const sum = [...weight.values()].reduce((a, b) => a + b, 0);
    return [...weight.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([genre, w]) => ({ genre, label: genreName(genre), share: sum ? Math.round((w / sum) * 100) : 0 }));
  })();

  const top = recap.titles[0];
  const topPreview = top ? previews.get(keyOf(top)) : undefined;
  const topSeries = recap.series[0] ?? null;
  const favoriteTime = TIMES_OF_DAY.reduce((best, part) => (recap.timeOfDay[part] > recap.timeOfDay[best] ? part : best), "evening" as TimeOfDay);
  const maxTimeOfDay = Math.max(...TIMES_OF_DAY.map((part) => recap.timeOfDay[part]));
  const activeAvg = recap.activeDays ? recap.totalSeconds / recap.activeDays : 0;

  const stats = [
    { value: timeText, label: t("recap.statTime") },
    { value: String(recap.titles.length), label: t("recap.statTitles") },
    { value: String(recap.movies.length), label: t("recap.statMovies") },
    { value: String(recap.episodesWatched), label: t("recap.statEpisodes") },
    { value: String(recap.moviesFinished + recap.episodesFinished), label: t("recap.statFinished") },
    { value: `${recap.activeDays}/7`, label: t("recap.statDays") },
  ];

  const slides: { key: string; image?: string | null; body: React.ReactNode }[] = [];

  // 1. Intro
  slides.push({
    key: "intro",
    image: top?.image,
    body: (
      <>
        <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">{range}</p>
        <h2 className="mt-3 font-display text-4xl leading-tight font-semibold text-white">{t("recap.subtitle")}</h2>
        <div className="mt-6 flex -space-x-6">
          {recap.titles.slice(0, 4).map((title, i) => (
            <div key={keyOf(title)} style={{ transform: `rotate(${(i - 1.5) * 5}deg)` }}>
              <Poster src={posterOf(title)} alt={title.title} className="aspect-2/3 w-20 shadow-xl" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">⏱ {timeText}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">🎬 {t("recap.titlesTitle", { count: recap.titles.length })}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">📅 {recap.activeDays}/7</span>
        </div>
      </>
    ),
  });

  // 2. Time, per day
  slides.push({
    key: "time",
    body: (
      <>
        <p className="text-base text-white/70">{t("recap.timeTitle")}</p>
        <p className="mt-1 font-display text-5xl font-semibold tabular-nums text-white">{timeText}</p>
        <p className={`mt-2 text-sm font-semibold ${change !== null && change > 0 ? "text-emerald-300" : change !== null && change < -4 ? "text-rose-300" : "text-white/70"}`}>
          {changeText}
        </p>
        <div className="mt-6 flex h-32 items-end gap-2">
          {recap.perDay.map((seconds, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[0.625rem] font-semibold tabular-nums text-white/60">{seconds > 0 ? Math.round(seconds / 60) : ""}</span>
              <span
                className={`w-full rounded-t-md ${i === recap.busiestDay ? "bg-white" : "bg-white/35"}`}
                style={{ height: `${maxDay > 0 ? Math.max(seconds > 0 ? 6 : 2, (seconds / maxDay) * 100) : 2}%` }}
              />
              <span className="text-[0.625rem] text-white/60 capitalize">{dayShort(i)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/75">{t("recap.avgPerDay", { time: formatTime(activeAvg, t) })}</p>
        {recap.busiestDay !== null && (
          <p className="mt-1 text-sm text-white/75">{t("recap.longestDay", { day: dayName(recap.busiestDay), time: formatTime(recap.perDay[recap.busiestDay], t) })}</p>
        )}
        <p className="mt-4 text-[0.6875rem] leading-snug text-white/40">{sourceNote}</p>
      </>
    ),
  });

  // 3. Most watched title
  if (top) {
    const year = topPreview?.releaseDate?.slice(0, 4);
    slides.push({
      key: "top",
      image: top.image,
      body: (
        <>
          <p className="text-base text-white/70">{t("recap.topTitle")}</p>
          <div className="mt-4 flex gap-4">
            <Poster src={posterOf(top)} alt={top.title} className="aspect-2/3 w-28" />
            <div className="min-w-0">
              <Link href={hrefFor(top)} className="block font-display text-2xl leading-tight font-semibold text-white hover:underline">
                {top.title}
              </Link>
              <p className="mt-1 flex items-center gap-2 text-xs text-white/65">
                {year && <span>{year}</span>}
                {topPreview?.tmdbRating && (
                  <span className="flex items-center gap-0.5">
                    <Star size={11} className="fill-amber-300 text-amber-300" />
                    {Number(topPreview.tmdbRating).toFixed(1)}
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{t("recap.timeSpent", { time: formatTime(top.seconds, t) })}</p>
              <p className="mt-1 text-xs text-white/70">
                {top.kind === "tv"
                  ? t("recap.episodesCount", { count: top.episodes.length })
                  : top.finished
                    ? `✓ ${t("recap.finishedBadge")}`
                    : top.percent !== null
                      ? t("recap.percentWatched", { p: top.percent })
                      : ""}
              </p>
            </div>
          </div>
          {topPreview?.description && <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-white/70">{topPreview.description}</p>}
        </>
      ),
    });
  }

  // 4. Series of the week, with its episodes
  if (topSeries) {
    const done = topSeries.episodes.filter((e) => e.finished).length;
    slides.push({
      key: "series",
      image: topSeries.image,
      body: (
        <>
          <p className="text-base text-white/70">{t("recap.topSeriesTitle")}</p>
          <div className="mt-3 flex items-center gap-3">
            <Poster src={posterOf(topSeries)} alt={topSeries.title} className="aspect-2/3 w-16" />
            <div className="min-w-0">
              <Link href={hrefFor(topSeries)} className="block font-display text-2xl leading-tight font-semibold text-white hover:underline">
                {topSeries.title}
              </Link>
              <p className="mt-1 text-xs text-white/70">{t("recap.timeSpent", { time: formatTime(topSeries.seconds, t) })}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-white/80">{t("recap.episodesFinished", { done, total: topSeries.episodes.length })}</p>
          <div className="mt-3 flex max-h-44 flex-wrap gap-1.5 overflow-hidden">
            {topSeries.episodes.map((e) => (
              <span
                key={`${e.season}-${e.episode}`}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums ${e.finished ? "bg-white text-neutral-900" : "bg-white/15 text-white"}`}
              >
                {e.finished && <Check size={11} strokeWidth={3} />}S{e.season} E{e.episode}
                {!e.finished && e.percent !== null && <span className="text-white/60">· {e.percent}%</span>}
              </span>
            ))}
          </div>
          {recap.series.length > 1 && (
            <p className="mt-4 text-xs text-white/55">+ {recap.series.slice(1, 4).map((s) => s.title).join(", ")}</p>
          )}
        </>
      ),
    });
  }

  // 5. Movies
  if (recap.movies.length > 0) {
    slides.push({
      key: "movies",
      body: (
        <>
          <p className="font-display text-3xl font-semibold text-white">{t("recap.moviesTitle")}</p>
          <ul className="mt-4 space-y-3">
            {recap.movies.slice(0, 5).map((movie) => (
              <li key={keyOf(movie)} className="flex items-center gap-3">
                <Poster src={posterOf(movie)} alt={movie.title} className="aspect-2/3 w-10" />
                <div className="min-w-0 flex-1">
                  <Link href={hrefFor(movie)} className="block truncate text-sm font-semibold text-white hover:underline">
                    {movie.title}
                  </Link>
                  <p className="mb-1 text-[0.6875rem] text-white/60">
                    {movie.finished ? `✓ ${t("recap.finishedBadge")}` : movie.percent !== null ? t("recap.percentWatched", { p: movie.percent }) : ""} ·{" "}
                    {formatTime(movie.seconds, t)}
                  </p>
                  <Bar value={movie.finished ? 100 : (movie.percent ?? 0)} max={100} className={movie.finished ? "bg-emerald-300" : "bg-white"} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }

  // 6. Genres
  if (genres.length > 0) {
    slides.push({
      key: "genres",
      body: (
        <>
          <p className="text-base text-white/70">{t("recap.genresTitle")}</p>
          <p className="mt-1 font-display text-5xl font-semibold text-white">{genres[0].label}</p>
          <ul className="mt-6 space-y-3">
            {genres.map((g) => (
              <li key={g.genre}>
                <div className="mb-1 flex justify-between text-sm text-white/85">
                  <span>{g.label}</span>
                  <span className="tabular-nums text-white/60">{g.share}%</span>
                </div>
                <Bar value={g.share} max={genres[0].share} />
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }

  // 7. When you watch
  slides.push({
    key: "when",
    body: (
      <>
        <p className="text-base text-white/70">{t("recap.whenTitle")}</p>
        <p className="mt-1 font-display text-4xl font-semibold text-white">{t("recap.favoriteTime", { part: t(`recap.${favoriteTime}`).toLowerCase() })}</p>
        <ul className="mt-5 space-y-3">
          {TIMES_OF_DAY.map((part) => (
            <li key={part}>
              <div className="mb-1 flex justify-between text-sm text-white/85">
                <span>{t(`recap.${part}`)}</span>
                <span className="tabular-nums text-white/60">{recap.timeOfDay[part] >= 30 ? formatTime(recap.timeOfDay[part], t) : "—"}</span>
              </div>
              <Bar value={recap.timeOfDay[part]} max={maxTimeOfDay} className={part === favoriteTime ? "bg-white" : "bg-white/50"} />
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-1.5 text-sm text-white/80">
          {recap.busiestDay !== null && (
            <p>
              📅 {t("recap.dayTitle")}: <span className="font-semibold capitalize text-white">{dayName(recap.busiestDay)}</span>
            </p>
          )}
          {recap.streak > 1 && (
            <p className="flex items-center gap-1.5">
              <Flame size={14} className="text-orange-300" /> {t("recap.streak", { n: recap.streak })}
            </p>
          )}
          {recap.nightOwl && (
            <p className="flex items-center gap-1.5">
              <Moon size={14} className="text-indigo-300" /> {t("recap.nightOwl")}
            </p>
          )}
        </div>
      </>
    ),
  });

  // 8. Still to finish
  if (recap.inProgress.length > 0) {
    slides.push({
      key: "continue",
      body: (
        <>
          <p className="font-display text-3xl font-semibold text-white">{t("recap.continueTitle")}</p>
          <ul className="mt-4 space-y-3">
            {recap.inProgress.slice(0, 4).map((title) => {
              const lastEpisode = title.episodes[title.episodes.length - 1];
              const percent = title.kind === "tv" ? lastEpisode?.percent : title.percent;
              return (
                <li key={keyOf(title)} className="flex items-center gap-3">
                  <Poster src={posterOf(title)} alt={title.title} className="aspect-2/3 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{title.title}</p>
                    <p className="mb-1 text-[0.6875rem] text-white/60">
                      {title.kind === "tv" && lastEpisode ? `S${lastEpisode.season} E${lastEpisode.episode} · ` : ""}
                      {percent !== null && percent !== undefined ? t("recap.percentLeft", { p: 100 - percent }) : ""}
                    </p>
                    <Bar value={percent ?? 0} max={100} />
                  </div>
                  <Link
                    href={hrefFor(title)}
                    className="relative z-[6] flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[0.6875rem] font-semibold text-neutral-900"
                  >
                    <Play size={11} className="fill-current" />
                    {t("recap.continue")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ),
    });
  }

  // 9. Summary
  slides.push({
    key: "summary",
    image: recap.last?.image,
    body: (
      <>
        <p className="font-display text-4xl font-semibold text-white">{t("recap.summary")}</p>
        <p className="mt-1 text-xs text-white/55">{range}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="font-display text-xl font-semibold tabular-nums text-white">{stat.value}</p>
              <p className="text-[0.6875rem] text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
        {genres[0] && <p className="mt-4 text-sm text-white/80">🎭 {genres.slice(0, 2).map((g) => g.label).join(" · ")}</p>}
        {recap.first && recap.last && recap.first !== recap.last && (
          <p className="mt-2 text-sm text-white/65">
            {t("recap.firstLast")} „{recap.first.title}“, {t("recap.endedWith")} „{recap.last.title}“.
          </p>
        )}
      </>
    ),
  });

  const isLast = index === slides.length - 1;

  // Paused while the share sheet is open: it's sharing this card.
  useEffect(() => {
    if (isLast || shareOpen) return;
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, isLast, slides.length, shareOpen]);

  const slide = slides[Math.min(index, slides.length - 1)];

  /** The message for the card on screen — what "Сподели" sends with its picture. */
  const shareLines = (key: string): string[] => {
    const header = `🎬 ${t("recap.shareHeader")} (${range})`;
    const list = (titles: RecapTitle[]) => titles.slice(0, 4).map((title) => title.title).join(", ");
    switch (key) {
      case "time":
        return [
          header,
          t("recap.shareTimeLine", { time: timeText }),
          ...(recap.busiestDay !== null ? [t("recap.shareDaysLine", { n: recap.activeDays, day: dayName(recap.busiestDay) })] : []),
          ...(change !== null && Math.abs(change) >= 5 ? [changeText] : []),
        ];
      case "top":
        return top ? [header, t("recap.shareTopLine", { title: top.title, time: formatTime(top.seconds, t) })] : [header];
      case "series":
        return topSeries ? [header, t("recap.shareSeriesLine", { title: topSeries.title, count: topSeries.episodes.length })] : [header];
      case "movies":
        return [header, t("recap.shareMoviesLine", { list: list(recap.movies) })];
      case "genres":
        return [header, t("recap.shareGenresLine", { list: genres.map((g) => `${g.label} ${g.share}%`).join(", ") })];
      case "when":
        return [
          header,
          t("recap.shareWhenLine", { part: t(`recap.${favoriteTime}`).toLowerCase() }),
          ...(recap.busiestDay !== null ? [t("recap.shareDaysLine", { n: recap.activeDays, day: dayName(recap.busiestDay) })] : []),
          ...(recap.streak > 1 ? [`🔥 ${t("recap.streak", { n: recap.streak })}`] : []),
        ];
      case "continue":
        return [header, t("recap.shareContinueLine", { list: list(recap.inProgress) })];
      default:
        // intro / summary: the whole week.
        return [
          header,
          t("recap.shareTimeLine", { time: timeText }),
          `🍿 ${t("recap.titlesTitle", { count: recap.titles.length })} (${t("nav.movies")}: ${recap.movies.length} · ${t("sections.episodes")}: ${recap.episodesWatched})`,
          ...(top ? [t("recap.shareTopLine", { title: top.title, time: formatTime(top.seconds, t) })] : []),
          ...(genres.length ? [t("recap.shareGenresLine", { list: genres.slice(0, 2).map((g) => g.label).join(", ") })] : []),
        ];
    }
  };
  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        ref={cardRef}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-[2rem] bg-neutral-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10"
      >
        <div key={`bg-${slide.key}`} className="animate-card-in absolute inset-0">
          {slide.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- decorative, already-sized still
            <img src={slide.image} alt="" className="h-full w-full scale-125 object-cover opacity-45 blur-2xl" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(167,139,250,0.35),transparent_60%),radial-gradient(ellipse_at_80%_90%,rgba(56,189,248,0.25),transparent_60%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/85" />
        </div>

        <div data-capture-skip className="absolute inset-x-4 top-4 z-10 flex gap-1">
          {slides.map((s, i) => (
            <span key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                key={i === index ? `run-${index}` : "static"}
                className={`block h-full rounded-full bg-white ${i < index ? "w-full" : i === index ? (isLast ? "w-full" : "animate-recap-bar") : "w-0"}`}
                style={i === index && !isLast ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
              />
            </span>
          ))}
        </div>

        <div key={slide.key} className="animate-hero-content-in relative z-[5] flex h-full flex-col justify-center overflow-hidden px-6 pt-10 pb-6">
          {slide.body}
        </div>

        {/* The site's mark in the corner — it travels with the shared picture. */}
        <p className="pointer-events-none absolute right-5 bottom-4 z-[5] font-display text-xs font-semibold tracking-wide text-white/45">AuroraFlix · auroraflix.cloud</p>

        {/* Tap zones (under links/buttons inside the slide): left back, right forward. */}
        <button
          data-capture-skip
          type="button"
          aria-label={t("recap.prev")}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="absolute inset-y-0 left-0 z-[4] w-1/4"
        />
        <button
          data-capture-skip
          type="button"
          aria-label={t("recap.next")}
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          className="absolute inset-y-0 right-0 z-[4] w-1/4"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            aria-label={t("recap.prev")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-foreground/75 hover:bg-white/10"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-foreground/50">
            {index + 1}/{slides.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
            aria-label={t("recap.next")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-foreground/75 hover:bg-white/10"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <Share2 size={15} />
          {t("recap.share")}
        </button>
      </div>

      {shareOpen && (
        <RecapShareSheet lines={shareLines(slide.key)} capture={captureCard} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
