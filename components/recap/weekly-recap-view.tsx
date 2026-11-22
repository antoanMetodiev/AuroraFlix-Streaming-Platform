"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clapperboard, Download, Share2 } from "lucide-react";
import { EmptyIllustration } from "@/components/ui/empty-illustration";
import { Loader } from "@/components/ui/loader";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { useTranslation } from "@/lib/i18n/locale-context";
import { genreLabel } from "@/lib/i18n/translate";
import { getMovieSlug } from "@/lib/tmdb";
import { useWatchProgress, useWatchProgressReady } from "@/lib/watch-progress";
import { weeklyRecap, type RecapTitle, type WeeklyRecap } from "@/lib/weekly-recap";
import { renderRecapImage } from "@/components/recap/recap-image";

const SLIDE_MS = 6000;
/** A typical film, for "that's about N films". */
const FILM_SECONDS = 110 * 60;

function hrefFor(title: RecapTitle) {
  return title.kind === "tv" ? `/series/${title.tmdbId}` : `/movies/${getMovieSlug({ title: title.title, tmdbId: title.tmdbId })}`;
}

/** The genre with the most watch time among the week's top titles, via their (cached) previews. */
function useTopGenre(recap: WeeklyRecap | null): string | null {
  const [genre, setGenre] = useState<string | null>(null);
  useEffect(() => {
    if (!recap || recap.titles.length === 0) return;
    let cancelled = false;
    const top = recap.titles.slice(0, 6);
    Promise.all(top.map((title) => (title.kind === "movie" ? getMoviePreview(title.tmdbId) : getSeriesPreview(title.tmdbId)).catch(() => null))).then(
      (previews) => {
        if (cancelled) return;
        const weight = new Map<string, number>();
        previews.forEach((preview, i) => {
          for (const g of (preview?.genres ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
            weight.set(g, (weight.get(g) ?? 0) + top[i].seconds + 1);
          }
        });
        const best = [...weight.entries()].sort((a, b) => b[1] - a[1])[0];
        setGenre(best?.[0] ?? null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [recap]);
  return recap && recap.titles.length ? genre : null;
}

export function WeeklyRecapView() {
  const { t, locale } = useTranslation();
  const progress = useWatchProgress();
  const ready = useWatchProgressReady();
  const [weeksAgo, setWeeksAgo] = useState(0);
  const recap = useMemo(() => (ready ? weeklyRecap(progress, weeksAgo) : null), [progress, ready, weeksAgo]);
  const topGenre = useTopGenre(recap);

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
            <RecapStory key={weeksAgo} recap={recap} topGenre={topGenre} range={range} />
          )}
        </div>
      </div>
    </div>
  );
}

function RecapStory({ recap, topGenre, range }: { recap: WeeklyRecap; topGenre: string | null; range: string }) {
  const { t, locale } = useTranslation();
  const [index, setIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const hours = Math.floor(recap.totalSeconds / 3600);
  const minutes = Math.round((recap.totalSeconds % 3600) / 60);
  const timeText = t("recap.hours", { h: hours, m: minutes });
  const films = Math.max(1, Math.round(recap.totalSeconds / FILM_SECONDS));
  const dayName =
    recap.busiestDay !== null
      ? new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(recap.start.getTime() + recap.busiestDay * 86_400_000 + 43_200_000))
      : null;
  const genreText = topGenre ? genreLabel(topGenre, locale) : null;

  const slides: { key: string; image?: string | null; body: React.ReactNode }[] = [
    {
      key: "intro",
      image: recap.titles[0]?.image,
      body: (
        <>
          <p className="text-sm font-semibold tracking-[0.2em] text-white/60 uppercase">{range}</p>
          <h2 className="mt-3 font-display text-4xl leading-tight font-semibold text-white">{t("recap.subtitle")}</h2>
        </>
      ),
    },
    {
      key: "time",
      image: recap.titles[1]?.image ?? recap.titles[0]?.image,
      body: (
        <>
          <p className="text-lg text-white/70">{t("recap.timeTitle")}</p>
          <p className="mt-2 font-display text-6xl font-semibold tabular-nums text-white">{timeText}</p>
          <p className="mt-4 text-base text-white/70">{t("recap.timeNote", { n: films })}</p>
          <p className="mt-6 text-xs text-white/40">{t("recap.estimate")}</p>
        </>
      ),
    },
    {
      key: "titles",
      body: (
        <>
          <p className="font-display text-5xl font-semibold text-white">{t("recap.titlesTitle", { count: recap.titles.length })}</p>
          <p className="mt-2 text-sm text-white/65">
            {t("recap.titlesBreakdown", { movies: recap.movies, episodes: recap.episodes, finished: recap.finished })}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {recap.titles.slice(0, 6).map((title) => (
              <Link key={`${title.kind}-${title.tmdbId}`} href={hrefFor(title)} className="group relative aspect-video overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
                {title.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- already-sized TMDB stills, no optimizer in use
                  <img src={title.image} alt={title.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
              </Link>
            ))}
          </div>
        </>
      ),
    },
    ...(recap.topSeries
      ? [
          {
            key: "series",
            image: recap.topSeries.image,
            body: (
              <>
                <p className="text-lg text-white/70">{t("recap.topSeriesTitle")}</p>
                <Link href={hrefFor(recap.topSeries)} className="mt-2 block font-display text-5xl leading-tight font-semibold text-white hover:underline">
                  {recap.topSeries.title}
                </Link>
                <p className="mt-3 text-base text-white/70">{t("recap.episodesCount", { count: recap.topSeries.episodes })}</p>
              </>
            ),
          },
        ]
      : []),
    ...(genreText
      ? [
          {
            key: "genre",
            body: (
              <>
                <p className="text-lg text-white/70">{t("recap.genreTitle")}</p>
                <p className="mt-2 font-display text-6xl font-semibold text-white">{genreText}</p>
              </>
            ),
          },
        ]
      : []),
    ...(dayName
      ? [
          {
            key: "day",
            body: (
              <>
                <p className="text-lg text-white/70">{t("recap.dayTitle")}</p>
                <p className="mt-2 font-display text-6xl font-semibold text-white capitalize">{dayName}</p>
                {recap.nightOwl && <p className="mt-5 text-base text-white/75">{t("recap.nightOwl")}</p>}
              </>
            ),
          },
        ]
      : []),
    {
      key: "summary",
      image: recap.last?.image,
      body: (
        <>
          <p className="font-display text-4xl font-semibold text-white">{t("recap.summary")}</p>
          <ul className="mt-5 space-y-1.5 text-base text-white/80">
            <li>⏱ {timeText}</li>
            <li>🎬 {t("recap.titlesTitle", { count: recap.titles.length })}</li>
            {recap.topSeries && <li>📺 {recap.topSeries.title}</li>}
            {genreText && <li>🎭 {genreText}</li>}
          </ul>
          {recap.first && recap.last && recap.first !== recap.last && (
            <p className="mt-5 text-sm text-white/60">
              {t("recap.firstLast")} „{recap.first.title}“, {t("recap.endedWith")} „{recap.last.title}“.
            </p>
          )}
        </>
      ),
    },
  ];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    if (isLast) return;
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, isLast, slides.length]);

  const share = async () => {
    setIsSharing(true);
    try {
      const blob = await renderRecapImage({
        range,
        heading: t("recap.subtitle"),
        lines: [
          `⏱ ${timeText}`,
          `🎬 ${t("recap.titlesTitle", { count: recap.titles.length })}`,
          ...(recap.topSeries ? [`📺 ${recap.topSeries.title}`] : []),
          ...(genreText ? [`🎭 ${genreText}`] : []),
        ],
        images: recap.titles.slice(0, 3).map((title) => title.image).filter((src): src is string => Boolean(src)),
      });
      if (!blob) return;
      const file = new File([blob], "auroraflix-week.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t("recap.subtitle") }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const slide = slides[index];
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[2rem] bg-neutral-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10">
        {/* Background: the slide's still, blurred, or the site's soft glow. */}
        <div key={`bg-${slide.key}`} className="animate-card-in absolute inset-0">
          {slide.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- decorative, already-sized still
            <img src={slide.image} alt="" className="h-full w-full scale-125 object-cover opacity-45 blur-2xl" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(167,139,250,0.35),transparent_60%),radial-gradient(ellipse_at_80%_90%,rgba(56,189,248,0.25),transparent_60%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />
        </div>

        {/* Story progress bars. */}
        <div className="absolute inset-x-4 top-4 z-10 flex gap-1">
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

        <div key={slide.key} className="animate-hero-content-in relative z-[5] flex h-full flex-col justify-center px-7">
          {slide.body}
        </div>

        {/* Tap zones: left half back, right half forward. */}
        <button type="button" aria-label={t("recap.prev")} onClick={() => setIndex((i) => Math.max(0, i - 1))} className="absolute inset-y-0 left-0 z-[4] w-1/3" />
        <button
          type="button"
          aria-label={t("recap.next")}
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          className="absolute inset-y-0 right-0 z-[4] w-1/3"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            aria-label={t("recap.prev")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-foreground/75 hover:bg-white/10"
          >
            <ChevronLeft size={18} />
          </button>
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
          onClick={share}
          disabled={isSharing}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {typeof navigator !== "undefined" && "share" in navigator ? <Share2 size={15} /> : <Download size={15} />}
          {t("recap.share")}
        </button>
      </div>
    </div>
  );
}
