"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { tmdbImage } from "@/lib/tmdb";
import type { HeroItem } from "@/components/home/hero-item";

/** How long a title stays in the hero before moving on to the next one. */
const TITLE_MS = 10_000;

/** How often the time spent on this title is reported to the parent. */
const TICK_MS = 250;

/** The backdrop at two widths — phones take the w780 (~3x lighter), wide screens the w1280. */
export function heroImage(record: HeroItem["record"]): { src: string; srcSet: string } | null {
  const w780 = tmdbImage(record.backgroundImg_URL, "w780");
  const w1280 = tmdbImage(record.backgroundImg_URL, "w1280");
  if (!w780 || !w1280) return null;
  return { src: w1280, srcSet: `${w780} 780w, ${w1280} 1280w` };
}
export const HERO_IMAGE_SIZES = "100vw";

/**
 * The hero's backdrop: the title's own backdrop with a slow zoom. One image
 * per title — it used to be a slideshow of up to five stills, which cost a
 * catalog lookup through the gateway plus ~1 MB of extra images on every
 * visit, most of it before the page had even finished loading (and before
 * that, YouTube trailers: an iframe and ~1 MB of player JS). After TITLE_MS
 * the parent moves on to the next title.
 */
export function HeroBackground({
  record,
  onEnded,
  onProgress,
}: {
  record: HeroItem["record"];
  onEnded: () => void;
  /** 0–1 share of this title's time in the hero, every TICK_MS. */
  onProgress?: (fraction: number) => void;
}) {
  const image = heroImage(record);
  const [elapsed, setElapsed] = useState(0);
  // Flipped right after mount so the zoom eases from 1 to 1.08 over the title's time.
  const [zoomed, setZoomed] = useState(false);

  // In the server HTML as <link rel="preload">: the hero backdrop is usually
  // the page's largest paint, so it shouldn't wait for the <img> to be parsed.
  if (image) preload(image.src, { as: "image", imageSrcSet: image.srcSet, imageSizes: HERO_IMAGE_SIZES, fetchPriority: "high" });

  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onEndedRef.current = onEnded;
    onProgressRef.current = onProgress;
  }, [onEnded, onProgress]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setZoomed(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

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

  return (
    // Remounted per title (keyed by the parent), so this fade plays on every switch.
    <div className="animate-hero-bg-in absolute inset-0 -z-10 overflow-hidden bg-black">
      {image && (
        // A plain <img> rather than next/image: images are unoptimized here
        // (next.config.ts), and only a hand-written srcSet lets phones pick
        // the smaller TMDB size.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={HERO_IMAGE_SIZES}
          alt=""
          aria-hidden
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover ease-linear"
          style={{
            transform: zoomed ? "scale(1.08)" : "scale(1)",
            transitionProperty: "transform",
            transitionDuration: `${TITLE_MS}ms`,
          }}
        />
      )}

      <div className="absolute inset-0 z-10 bg-black/45" />
    </div>
  );
}
