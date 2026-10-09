"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { hrefFor, type WorkCardItem } from "@/components/media/work-carousel";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { RatingRing } from "@/components/ui/rating-ring";
import { tmdbImage } from "@/lib/tmdb";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { useTranslation } from "@/lib/i18n/locale-context";

export type PopularItem = WorkCardItem & { releaseYear?: string };

const AUTOPLAY_MS = 5000;
const VISIBLE_SIDE_CARDS = 3;
const SWIPE_THRESHOLD_PX = 40;

/**
 * 3D coverflow: the active title sits large in the middle, its neighbours
 * fan out to each side in perspective, and the active poster — blurred —
 * glows behind the whole stage. Deliberately nothing like the flat poster
 * rows (Last Viewed, Cult), so the "what's hot right now" row stands out.
 *
 * Auto-advances every AUTOPLAY_MS while on screen, paused while hovered or
 * focused. Arrows, clicking a side card, swiping and ←/→ all move it; the
 * centre card and the "Watch now" button open the title.
 */
function Coverflow({ heading, items }: { heading: string; items: PopularItem[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.25);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = items.length;
  const go = useCallback((delta: number) => setActive((current) => (current + delta + count) % count), [count]);

  useEffect(() => {
    if (!inView || paused || count < 2) return;
    const timer = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [inView, paused, count, go]);

  if (count === 0) return null;

  const current = items[active];
  const currentRating = Number(current.tmdbRating);

  return (
    <section
      ref={ref}
      className={`reveal relative overflow-hidden bg-background pt-14 pb-6 sm:pt-20 ${inView ? "" : "reveal-hidden"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Ambient glow — the active poster, blurred, cross-fading as it changes. */}
      {items.map((item, index) => (
        <div
          key={item.key}
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-24 bottom-0 transition-opacity duration-1000 ${index === active ? "opacity-100" : "opacity-0"}`}
        >
          <FadeInImage src={tmdbImage(item.posterURL, "w342") ?? ""} alt="" sizes="230px" className="scale-110 object-cover opacity-60 blur-3xl" />
        </div>
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_75%)]" />

      <SectionHeading className="relative px-4 sm:px-6 lg:px-8">{heading}</SectionHeading>

      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={heading}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") go(-1);
          if (event.key === "ArrowRight") go(1);
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = event.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) > SWIPE_THRESHOLD_PX) go(delta < 0 ? 1 : -1);
        }}
        className="relative mx-auto h-[300px] max-w-[90rem] outline-none [perspective:1400px] sm:h-[380px]"
      >
        {items.map((item, index) => {
          // Shortest way round, so the last card sits to the left of the first.
          let offset = index - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const distance = Math.abs(offset);
          const isActive = offset === 0;
          const hidden = distance > VISIBLE_SIDE_CARDS;

          return (
            <button
              key={item.key}
              type="button"
              tabIndex={-1}
              aria-hidden={!isActive}
              onClick={() => (isActive ? router.push(hrefFor(item)) : go(offset))}
              className="absolute top-1/2 left-1/2 aspect-[2/3] w-[170px] cursor-pointer transition-all duration-500 ease-out sm:w-[230px]"
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 62}%) translateZ(${-distance * 120}px) rotateY(${-offset * 32}deg)`,
                zIndex: 50 - distance,
                opacity: hidden ? 0 : 1 - distance * 0.18,
                pointerEvents: hidden ? "none" : "auto",
              }}
            >
              <div
                className={`relative h-full w-full overflow-hidden rounded-2xl transition-shadow duration-500 ${
                  isActive
                    ? "shadow-[0_30px_60px_-15px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.25),0_0_45px_-5px_rgba(255,255,255,0.25)]"
                    : "shadow-[0_20px_40px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)]"
                }`}
              >
                <FadeInImage src={tmdbImage(item.posterURL, "w342") ?? ""} alt={item.title} sizes="230px" className="object-cover" />
                {!isActive && <span className="absolute inset-0 bg-black" style={{ opacity: Math.min(0.15 + distance * 0.15, 0.6) }} />}
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("carousel.scrollLeft")}
          className="absolute top-1/2 left-2 z-[60] flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white hover:text-black sm:left-6"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={t("carousel.scrollRight")}
          className="absolute top-1/2 right-2 z-[60] flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white hover:text-black sm:right-6"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Details of the active title — keyed so it re-animates on every change. */}
      <div key={current.key} className="animate-popular-info relative mx-auto mt-6 flex max-w-xl flex-col items-center px-4 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
          #{active + 1} · {current.type === "SERIES" ? t("watchlist.series") : t("watchlist.movie")}
          {current.releaseYear && ` · ${current.releaseYear}`}
        </p>
        <h3 className="mt-2 line-clamp-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{current.title}</h3>
        <div className="mt-4 flex items-center gap-4">
          {Number.isFinite(currentRating) && <RatingRing value={currentRating} size="sm" />}
          <Link
            href={hrefFor(current)}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_6px_24px_-4px_rgba(255,255,255,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_rgba(255,255,255,0.65)]"
          >
            <Play size={16} className="fill-current" />
            {t("hero.watchNow")}
          </Link>
        </div>

        <div className="mt-6 flex gap-1.5">
          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${index + 1}. ${item.title}`}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${index === active ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PopularCarousels({ movies, series }: { movies: PopularItem[]; series: PopularItem[] }) {
  const { t } = useTranslation();

  return (
    <>
      <Coverflow heading={t("home.popularMovies")} items={movies} />
      <Coverflow heading={t("home.popularShows")} items={series} />
    </>
  );
}
