"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { tmdbImage } from "@/lib/tmdb";
import { SHIMMER_BLUR_DATA_URL } from "@/lib/shimmer";
import type { HeroItem } from "@/components/home/hero-item";

/** How long each still stays up before the next fades in. */
const SLIDE_MS = 6000;

/** The cross-fade between two stills. */
const FADE_MS = 1500;

/** Stills per title: its own backdrop plus up to four more from the catalog. */
const MAX_SLIDES = 5;

/** How long a title stays in the hero before moving on to the next one. */
const TITLE_MS = SLIDE_MS * MAX_SLIDES;

/** How often the time spent on this title is reported to the parent. */
const TICK_MS = 250;

/**
 * The hero's backdrop: a slideshow of the title's own stills, cross-fading
 * every SLIDE_MS with a slow zoom — in place of the YouTube trailers it used
 * to play, which cost an iframe and ~1 MB of player JS on every visit.
 *
 * It opens on the trending row's backdrop straight away; the rest come from
 * the catalog record (get-movie-details / get-series-details by TMDB id, the
 * same cached lookup the friends panel uses), each one only shown once it
 * has loaded. After TITLE_MS the parent moves on to the next title.
 */
export function HeroBackground({
  record,
  type,
  onEnded,
  onProgress,
}: {
  record: HeroItem["record"];
  type: HeroItem["type"];
  onEnded: () => void;
  /** 0–1 share of this title's time in the hero, every TICK_MS. */
  onProgress?: (fraction: number) => void;
}) {
  const first = tmdbImage(record.backgroundImg_URL, "w1280");
  const [slides, setSlides] = useState<string[]>(first ? [first] : []);
  const [elapsed, setElapsed] = useState(0);

  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onEndedRef.current = onEnded;
    onProgressRef.current = onProgress;
  }, [onEnded, onProgress]);

  // Trending movie rows carry the TMDB id as movieId; series as tmdbId.
  const tmdbId = record.tmdbId ?? (record as { movieId?: string | null }).movieId ?? null;

  // The catalog's other backdrops, appended one by one as each finishes
  // loading, so a slide never fades in half-drawn.
  useEffect(() => {
    if (!tmdbId) return;
    let cancelled = false;
    const loaders: HTMLImageElement[] = [];

    const lookup = type === "series" ? getSeriesPreview(tmdbId) : getMoviePreview(tmdbId);
    void lookup.then((details) => {
      if (cancelled || !details?.imagesList) return;
      const seen = new Set([record.backgroundImg_URL]);
      const extra = details.imagesList
        .filter((image) => image.imageType === "BACKDROP" && image.imageURL && !seen.has(image.imageURL) && seen.add(image.imageURL))
        .slice(0, MAX_SLIDES - 1)
        .map((image) => tmdbImage(image.imageURL, "w1280"))
        .filter((src): src is string => Boolean(src));

      for (const src of extra) {
        const loader = new window.Image();
        loader.onload = () => {
          if (!cancelled) setSlides((current) => (current.includes(src) ? current : [...current, src]));
        };
        loader.src = src;
        loaders.push(loader);
      }
    });

    return () => {
      cancelled = true;
      loaders.forEach((loader) => (loader.onload = null));
    };
  }, [tmdbId, record.backgroundImg_URL, type]);

  // The clock for this title — it only runs while the tab is visible, so a
  // background tab doesn't race through the whole carousel.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsed((current) => current + TICK_MS);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    onProgressRef.current?.(Math.min(elapsed / TITLE_MS, 1));
    if (elapsed >= TITLE_MS) onEndedRef.current();
  }, [elapsed]);

  const active = slides.length > 0 ? Math.floor(elapsed / SLIDE_MS) % slides.length : 0;

  return (
    // Remounted per title (keyed by the parent), so this fade plays on every switch.
    <div className="animate-hero-bg-in absolute inset-0 -z-10 overflow-hidden bg-black">
      {slides.map((src, index) => {
        const isActive = index === active;
        return (
          <div
            key={src}
            aria-hidden
            className="absolute inset-0 ease-out"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "scale(1.08)" : "scale(1)",
              transitionProperty: "opacity, transform",
              transitionDuration: isActive ? `${FADE_MS}ms, ${SLIDE_MS + FADE_MS}ms` : `${FADE_MS}ms, 0ms`,
              transitionDelay: isActive ? "0ms" : `0ms, ${FADE_MS}ms`,
              transitionTimingFunction: "ease-in-out, linear",
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              priority={index === 0}
              placeholder={index === 0 ? "blur" : "empty"}
              blurDataURL={index === 0 ? SHIMMER_BLUR_DATA_URL : undefined}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        );
      })}

      <div className="absolute inset-0 z-10 bg-black/45" />
    </div>
  );
}
