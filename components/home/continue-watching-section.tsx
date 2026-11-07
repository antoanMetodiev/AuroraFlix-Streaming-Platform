"use client";

import Link from "next/link";
import { Maximize, Play, Volume2, X } from "lucide-react";
import { CarouselArrowButton } from "@/components/ui/carousel-arrow-button";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { useTranslation } from "@/lib/i18n/locale-context";
import { getMovieSlug, tmdbImage } from "@/lib/tmdb";
import { useHorizontalScroll } from "@/lib/use-horizontal-scroll";
import { useLocalizedTitles } from "@/lib/use-localized-titles";
import {
  continueWatching,
  dismissContinueWatching,
  formatPlaybackTime,
  progressPercent,
  useWatchProgress,
  type ContinueWatchingEntry,
} from "@/lib/watch-progress";

const MAX_ITEMS = 12;

type CardProps = {
  entry: ContinueWatchingEntry;
  title: string;
  image: string | null;
  href: string;
};

/** Looks like a paused player; the whole card is one link to the real one. */
function ContinueCard({ entry, title, image, href }: CardProps) {
  const { t } = useTranslation();
  const percent = progressPercent(entry);
  const episodeLabel = entry.season
    ? t("carousel.episodeShort", { season: entry.season, episode: entry.episode ?? "" })
    : null;

  const secondsLeft = entry.duration ? entry.duration - entry.seconds : 0;
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const stoppedAt = formatPlaybackTime(entry.seconds);
  const status = entry.duration
    ? t("continue.timeLeft", {
        time:
          hours > 0
            ? t("continue.hoursMinutes", { hours, minutes })
            : t("continue.minutes", { minutes: Math.max(1, minutes) }),
      })
    : t(entry.approximate ? "continue.stoppedAround" : "continue.stoppedAt", { time: stoppedAt });

  return (
    <div className="group relative w-[300px] shrink-0 sm:w-[400px]">
      <Link href={href} aria-label={t("continue.resume", { title })} className="block" draggable={false}>
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow,transform] duration-300 group-hover:-translate-y-1 group-hover:border-sky-400/50 group-hover:shadow-[0_16px_40px_-12px_rgba(56,189,248,0.4)]">
          {image && (
            <FadeInImage
              src={image}
              alt=""
              draggable={false}
              sizes="(min-width: 640px) 400px, 300px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/15 to-black/30" />

          <span className="absolute top-3 left-3 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {episodeLabel ?? t("continue.movie")}
          </span>

          <span className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-md transition-[transform,background-color,color] duration-300 group-hover:scale-110 group-hover:border-transparent group-hover:bg-white group-hover:text-black">
            <Play size={22} fill="currentColor" className="ml-0.5" />
          </span>

          <span aria-hidden className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-3 pb-2.5">
            <span className="relative block h-1 rounded-full bg-white/25">
              {percent !== null && (
                <>
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-sky-400"
                    style={{ width: `${percent}%` }}
                  />
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(56,189,248,0.9)]"
                    style={{ left: `${percent}%` }}
                  />
                </>
              )}
            </span>
            <span className="flex items-center gap-2.5 text-white/90">
              <Play size={13} fill="currentColor" />
              <Volume2 size={15} />
              <span className="text-xs font-medium tabular-nums">
                {entry.approximate ? "≈ " : ""}
                {stoppedAt}
                {entry.duration ? <span className="text-white/55"> / {formatPlaybackTime(entry.duration)}</span> : null}
              </span>
              <Maximize size={14} className="ml-auto" />
            </span>
          </span>
        </div>

        <div className="mt-3 px-0.5">
          <h3 className="truncate font-medium text-foreground">{title}</h3>
          <p className="mt-0.5 text-sm text-foreground/60">{status}</p>
        </div>
      </Link>

      {/* Next to the link, not in it: a button can't sit inside an anchor. */}
      <button
        type="button"
        onClick={() => dismissContinueWatching(entry.kind, entry.tmdbId)}
        aria-label={t("continue.remove")}
        title={t("continue.remove")}
        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white/85 backdrop-blur-sm transition-[opacity,background-color,transform] duration-200 hover:bg-white hover:text-black focus-visible:opacity-100 group-hover:-translate-y-1 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ContinueWatchingSection() {
  const { t } = useTranslation();
  const progress = useWatchProgress();
  const entries = continueWatching(progress).slice(0, MAX_ITEMS);
  const { containerRef, canScrollLeft, canScrollRight, scrollBy, dragHandlers } = useHorizontalScroll<HTMLDivElement>([
    entries.length,
  ]);
  const localized = useLocalizedTitles(
    entries.map((entry) => ({ kind: entry.kind === "movie" ? ("movie" as const) : ("series" as const), tmdbId: entry.tmdbId }))
  );

  const cards = entries.flatMap((entry) => {
    const current = localized(entry.kind === "movie" ? "movie" : "series", entry.tmdbId);
    const title = current?.title ?? entry.title;
    // No saved name and the catalog hasn't answered (yet): nothing to show.
    if (!title) return [];
    return [
      {
        entry,
        title,
        image: entry.image ?? tmdbImage(current?.posterImgURL, "w780"),
        href:
          entry.kind === "movie"
            ? `/movies/${getMovieSlug({ title, originalTitle: current?.originalTitle, tmdbId: entry.tmdbId })}#watch`
            : `/series/${entry.tmdbId}#watch`,
      },
    ];
  });

  if (cards.length === 0) return null;

  return (
    <section className="relative w-full bg-background px-4 pt-3 pb-2 sm:px-6">
      <h2 className="mt-8 mb-5 font-display text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
        {t("continue.title")}
      </h2>

      <div className="relative">
        {canScrollLeft && <CarouselArrowButton direction="left" onClick={() => scrollBy(-420)} />}
        {canScrollRight && <CarouselArrowButton direction="right" onClick={() => scrollBy(420)} />}

        <div ref={containerRef} className="scrollbar-none flex gap-5 overflow-x-auto pt-1.5 pb-4 pl-1" {...dragHandlers}>
          {cards.map((card) => (
            <ContinueCard key={`${card.entry.kind}:${card.entry.tmdbId}`} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
