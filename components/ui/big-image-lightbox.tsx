"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { useProgressiveImage } from "@/lib/use-progressive-image";
import { useTranslation } from "@/lib/i18n/locale-context";
import { FadeInImage } from "@/components/ui/fade-in-image";

const ASPECT_BY_TYPE: Record<string, string> = {
  BACKDROP: "aspect-[60/32] w-[min(60em,90vw)]",
  POSTER: "aspect-[26/37] w-[min(26em,85vw)]",
  actor: "aspect-[22/35] w-[min(22em,80vw)]",
  user: "aspect-[33/37] w-[min(33em,85vw)]",
};

export type LightboxImage = { url: string; type: string };

export function BigImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(initialIndex);
  const canNavigate = images.length > 1;

  const goPrev = useCallback(() => setIndex((current) => (current - 1 + images.length) % images.length), [images.length]);
  const goNext = useCallback(() => setIndex((current) => (current + 1) % images.length), [images.length]);

  const current = images[index];
  // Same fast-then-sharp strategy as everywhere else: paint the w1280 render
  // immediately, then quietly upgrade to the original once it's preloaded.
  // FadeInImage crossfades both this upgrade AND every prev/next jump, since
  // its `key={displaySrc}` remount resets the fade each time the src changes.
  const { src: displaySrc, isHighRes } = useProgressiveImage(tmdbImage(current.url, "w1280"), tmdbImage(current.url, "original"));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && canNavigate) goPrev();
      else if (event.key === "ArrowRight" && canNavigate) goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext, canNavigate]);

  const sizeClasses = ASPECT_BY_TYPE[current.type] ?? ASPECT_BY_TYPE.BACKDROP;

  return (
    // Clicking anywhere in this backdrop closes the lightbox; the image panel
    // below stops the click from bubbling here so only it stays "un-closeable".
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <span className="fixed inset-0 z-0 bg-[radial-gradient(circle,rgba(0,0,0,0.95)_20%,rgba(0,0,0,1)_80%)]" />

      {/* This outer box is sized exactly like the image (same `sizeClasses`)
          but stays un-clipped, so the arrows below — positioned outside its
          edges via negative left/right — aren't cut off by the inner box's
          `overflow-hidden`. It's `relative`, not the viewport, that they're
          anchored to: a `fixed`/viewport-relative version of this sat at a
          constant distance from the screen edge, but the image's own width is
          responsive (`min(Xem, 90vw)`), so on narrower viewports the gap
          between image and screen edge shrank past that constant and the
          button ended up sitting on top of the image instead of beside it. */}
      <div onClick={(event) => event.stopPropagation()} className={`relative z-10 ${sizeClasses}`}>
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white/5 shadow-[0_15px_30px_rgba(255,255,255,0.2),0_0_60px_rgba(255,255,255,0.1)]">
          {displaySrc && (
            <FadeInImage
              key={displaySrc}
              src={displaySrc}
              alt=""
              // Once preloaded, this is the exact same request served unoptimized so
              // the swap reuses the browser cache instead of a second round-trip
              // through the image optimizer.
              unoptimized={isHighRes}
              priority={!isHighRes}
              sizes="90vw"
              className="object-cover"
            />
          )}
        </div>

        {canNavigate && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              aria-label={t("gallery.previous")}
              // Sits just outside the image on sm+ screens; on narrow phone
              // widths there's no room off to the side, so it falls back to
              // hugging the inside edge instead of running off-screen.
              className="absolute top-1/2 left-2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-110 hover:bg-white/90 sm:-left-16"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              aria-label={t("gallery.next")}
              className="absolute top-1/2 right-2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-110 hover:bg-white/90 sm:-right-16"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="fixed top-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>
    </div>
  );
}
