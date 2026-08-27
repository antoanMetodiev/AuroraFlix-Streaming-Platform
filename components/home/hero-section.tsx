"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { HeroBackground } from "@/components/home/hero-background";
import { RatingRing } from "@/components/ui/rating-ring";
import { getMovieSlug } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";

export function HeroSection({ movies }: { movies: Movie[] }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  // Fires once on first paint only — HeroSection never remounts on
  // prev/next/dot navigation (only HeroBackground does, via its own key), so
  // this plays the entrance once and stays out of the way of carousel clicks.
  // A plain setTimeout rather than requestAnimationFrame — rAF is paused for
  // backgrounded/hidden tabs (e.g. a middle-click "open in new tab"), which
  // would leave the entrance stuck invisible until the tab is focused.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 50);
    return () => window.clearTimeout(timeout);
  }, []);
  // Gates the mute/unmute button — toggling mute against a player that
  // hasn't started yet (or is still buffering) is what triggers the
  // pause-instead-of-unmute bug on some mobile browsers, so the button stays
  // inert until HeroBackground reports its player is actually ready.
  const [isVideoReady, setIsVideoReady] = useState(false);

  const currentMovie = movies[currentIndex];

  // Resetting isVideoReady lives in these event handlers rather than a
  // useEffect keyed on currentMovie.id — HeroBackground already fully
  // remounts on movie change (key={currentMovie.id}), so every path that
  // changes currentIndex is a plain user-triggered event, not something
  // that needs to be derived reactively from a prop.
  const goToPrevious = () => {
    setIsVideoReady(false);
    setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setIsVideoReady(false);
    setCurrentIndex((prev) => (prev === movies.length - 1 ? 0 : prev + 1));
  };

  if (!currentMovie) {
    return (
      <section className="relative flex h-[calc(70vh-4rem)] w-full items-center justify-center bg-background text-foreground sm:h-[calc(100dvh-4rem)]">
        <h1 className="px-6 text-center text-2xl font-semibold text-foreground/80 sm:text-3xl">
          {t("hero.welcome")}
        </h1>
      </section>
    );
  }

  const description = currentMovie.description ?? "";
  const truncatedDescription = description.length > 230 ? `${description.slice(0, 230)}..` : description;
  const movieHref = `/movies/${getMovieSlug(currentMovie)}`;
  const genreList = currentMovie.genres
    ? currentMovie.genres
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean)
    : [];

  return (
    <section className="bg-grain relative isolate h-[calc(85vh-4rem)] w-full overflow-hidden bg-black sm:h-[calc(100dvh-4rem)]">
      <HeroBackground key={currentMovie.id} movie={currentMovie} muted={muted} onEnded={goToNext} onReady={() => setIsVideoReady(true)} />

      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/10 to-transparent sm:bg-linear-to-t sm:from-black/70 sm:via-transparent sm:to-transparent" />

      <div className="absolute inset-x-0 bottom-24 z-20 px-4 sm:bottom-28 sm:px-8 lg:bottom-32 lg:px-16">
        <div className="max-w-xl lg:max-w-2xl">
          <div className={`reveal ${mounted ? "" : "reveal-hidden"}`}>
            {currentMovie.logoURL ? (
              <div className="relative mb-3 h-16 w-[140px] sm:h-20 sm:w-[180px] lg:h-24 lg:w-[210px]">
                <Image
                  src={currentMovie.logoURL}
                  alt={currentMovie.title}
                  fill
                  priority
                  sizes="210px"
                  className="object-contain object-left"
                />
              </div>
            ) : (
              <h1 className="mb-3 text-3xl leading-[1.05] font-extrabold tracking-tighter text-white text-balance sm:text-5xl lg:text-6xl">
                {currentMovie.title}
              </h1>
            )}
          </div>

          {truncatedDescription && (
            <p
              style={{ transitionDelay: "90ms" }}
              className={`reveal mb-3 line-clamp-2 max-w-xl text-xs leading-relaxed font-medium text-white/70 sm:line-clamp-3 sm:text-base sm:text-white/80 lg:text-lg ${mounted ? "" : "reveal-hidden"}`}
            >
              {truncatedDescription}
            </p>
          )}

          {currentMovie.description && (
            <p className="sr-only">{currentMovie.description}</p>
          )}

          <div
            style={{ transitionDelay: "160ms" }}
            className={`reveal mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-white/75 sm:gap-4 sm:text-sm lg:text-base ${mounted ? "" : "reveal-hidden"}`}
          >
            {genreList.map((genre) => (
              <Link
                key={genre}
                href={`/movies/genres/${encodeURIComponent(genre)}`}
                className="rounded-md bg-black/65 px-2 py-1 transition-colors duration-300 hover:bg-black/85 hover:text-white"
              >
                {genre}
              </Link>
            ))}
            {currentMovie.releaseDate && (
              <span className="rounded-md bg-black/65 px-2 py-1">{currentMovie.releaseDate}</span>
            )}
            <span className="rounded-md bg-black/65 px-2 py-1">4K</span>
          </div>

          <div
            style={{ transitionDelay: "230ms" }}
            className={`reveal flex items-center gap-3 sm:gap-4 ${mounted ? "" : "reveal-hidden"}`}
          >
            <Link
              href={movieHref}
              className="rounded-xl border border-white/25 bg-white/90 px-4 py-2.5 text-sm font-semibold tracking-wide text-black shadow-[0_6px_20px_rgba(255,255,255,0.17)] transition-transform duration-300 hover:scale-105 sm:px-6 sm:py-3 sm:text-base"
            >
              {t("hero.watchNow")}
            </Link>

            <RatingRing value={currentMovie.tmdbRating} className="border-2 border-white/55" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md sm:bottom-8 sm:gap-6 sm:px-5 sm:py-2.5">
        <button
          type="button"
          onClick={goToPrevious}
          aria-label={t("hero.previous")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-110 hover:bg-white/90 hover:text-black sm:h-11 sm:w-11"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {movies.map((movie, index) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => {
                setIsVideoReady(false);
                setCurrentIndex(index);
              }}
              aria-label={`${t("hero.show")} ${movie.title}`}
              aria-current={index === currentIndex}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 sm:h-2 sm:w-2 ${
                index === currentIndex ? "scale-125 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" : "bg-white/25 hover:bg-white/60"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goToNext}
          aria-label={t("hero.next")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-110 hover:bg-white/90 hover:text-black sm:h-11 sm:w-11"
        >
          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          disabled={!isVideoReady}
          onClick={() => setMuted((prev) => !prev)}
          aria-label={muted ? t("hero.unmute") : t("hero.mute")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-108 hover:bg-white/90 hover:text-black disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:w-10"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </section>
  );
}
