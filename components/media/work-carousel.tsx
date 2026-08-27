"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { RatingRing } from "@/components/ui/rating-ring";
import { requestMoreMoviesForActor } from "@/lib/api-public";
import { useHorizontalScroll } from "@/lib/use-horizontal-scroll";
import { CarouselArrowButton } from "@/components/ui/carousel-arrow-button";
import { Spinner } from "@/components/ui/loader";
import { useTranslation } from "@/lib/i18n/locale-context";

export type WorkCardItem = {
  key: string;
  title: string;
  posterURL: string;
  tmdbRating: string;
  type: "MOVIE" | "SERIES" | string;
  videoURL?: string | null;
  tmdbId?: string | null;
};

function hrefFor(item: WorkCardItem) {
  return item.type === "SERIES"
    ? `/series/${item.tmdbId}`
    : `/movies/${getMovieSlug({ title: item.title, tmdbId: item.tmdbId, videoURL: item.videoURL })}`;
}

const COOLDOWN_KEY_PREFIX = "add_movies_actor_cooldown_";
const COOLDOWN_MS = 3 * 60 * 1000;

export function WorkCarousel({
  items,
  mode,
  actorName,
  actorImdbId,
}: {
  items: WorkCardItem[];
  mode: "latest-works" | "last-viewed";
  actorName?: string;
  actorImdbId?: string | null;
}) {
  const { t } = useTranslation();
  const { containerRef, canScrollLeft, canScrollRight, scrollBy, dragHandlers } = useHorizontalScroll<HTMLDivElement>([items]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (mode !== "latest-works" || !actorImdbId) return;
    // Scoped per actor — this used to be a single shared key, so checking for
    // one actor's movies made every other actor's button show a stale "checking
    // started" cooldown state on navigation, even though nothing was requested for them.
    const cooldownKey = COOLDOWN_KEY_PREFIX + actorImdbId;

    const update = () => {
      const ts = window.localStorage.getItem(cooldownKey);
      if (!ts) {
        setRemainingMs(0);
        return;
      }
      const diff = COOLDOWN_MS - (Date.now() - Number(ts));
      if (diff <= 0) {
        window.localStorage.removeItem(cooldownKey);
        setRemainingMs(0);
        return;
      }
      setRemainingMs(diff);
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [mode, actorImdbId]);

  const handleRequestMoreMovies = async () => {
    if (!actorImdbId) return;
    setIsRequesting(true);
    await requestMoreMoviesForActor(actorImdbId);
    window.localStorage.setItem(COOLDOWN_KEY_PREFIX + actorImdbId, Date.now().toString());
    setRemainingMs(COOLDOWN_MS);
    setIsRequesting(false);
  };

  const isCarousel = items.length >= 7;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  if (items.length === 0) return null;

  return (
    <div className={`relative w-full px-4 py-3 sm:px-6 ${mode === "last-viewed" ? "bg-background" : ""}`}>
      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-light tracking-wide text-foreground sm:text-3xl">
          {mode === "latest-works" ? t("carousel.latestWorks") : t("carousel.lastViewed")}
        </h2>

        {mode === "latest-works" && actorImdbId && (
          <div className="w-full sm:w-auto">
            {remainingMs > 0 ? (
              <p className="rounded-full border border-foreground/15 bg-foreground/5 px-4 py-2.5 text-center text-sm text-foreground/70 backdrop-blur-md">
                {t("carousel.checkingStarted")} {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleRequestMoreMovies}
                disabled={isRequesting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-4px_rgba(255,255,255,0.5)] disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
              >
                {isRequesting && <Spinner size={14} />}
                {actorName ? `${t("carousel.checkForMoreWith")} ${actorName}` : t("carousel.checkForMoreGeneric")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        {isCarousel && canScrollLeft && <CarouselArrowButton direction="left" onClick={() => scrollBy(-300)} />}
        {isCarousel && canScrollRight && <CarouselArrowButton direction="right" onClick={() => scrollBy(300)} />}

        <div ref={containerRef} className="scrollbar-none flex gap-5 overflow-x-auto pb-4 pl-1" {...dragHandlers}>
          {items.map((item) => {
            const rating = Number(item.tmdbRating);
            return (
              <Link
                key={item.key}
                href={hrefFor(item)}
                className="group w-[200px] shrink-0 text-center sm:w-[240px]"
              >
                <div className="relative mt-2 aspect-[2/3] overflow-hidden rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.25)] transition-all duration-300 group-hover:scale-103 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                  <FadeInImage
                    src={tmdbImage(item.posterURL, "w500") ?? ""}
                    alt={item.title}
                    sizes="240px"
                    className="object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
                  {Number.isFinite(rating) && (
                    <RatingRing value={rating} size="xs" className="absolute right-2 bottom-2" />
                  )}
                </div>
                <div className="mt-2 text-sm text-foreground/70">
                  <h4 className="mx-auto w-[13.5em] max-w-full truncate font-medium text-foreground">{item.title}</h4>
                  <span>{item.type === "SERIES" ? t("watchlist.series") : t("watchlist.movie")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
