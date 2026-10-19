"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2 } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { getImagesByType } from "@/lib/images";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { FadeInImage } from "@/components/ui/fade-in-image";

// Only ever needed once someone clicks a thumbnail, so it has no business
// being in this page's initial bundle — ssr:false is safe (and correct) here
// since a lightbox that opens on click has nothing to show on first paint.
const BigImageLightbox = dynamic(() => import("@/components/ui/big-image-lightbox").then((mod) => mod.BigImageLightbox), {
  ssr: false,
});
import { SectionHeading } from "@/components/movies/details/section-heading";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { ImageType, MediaImage } from "@/types/media-image";

const PAGE_SIZE = 8;
const LOAD_MORE_STEP = 8;

export function ImageGallery({ images }: { images: MediaImage[] }) {
  const { t } = useTranslation();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.3);
  const [activeType, setActiveType] = useState<ImageType>("BACKDROP");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // The index into `visible` the lightbox opened on — not the clicked image's
  // URL — so its own prev/next arrows can page through the same on-screen set.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Only after the viewer switches tabs do the tiles animate in (one after
  // another) — on first view the section's own scroll reveal does that.
  const [hasSwitched, setHasSwitched] = useState(false);

  const allOfType = getImagesByType(images, activeType);
  const visible = allOfType.slice(0, visibleCount);
  const isExpanded = visible.length === allOfType.length && allOfType.length > PAGE_SIZE;

  if (images.length === 0) return null;

  const switchTab = (type: ImageType) => {
    if (type === activeType) return;
    setHasSwitched(true);
    setActiveType(type);
    setVisibleCount(PAGE_SIZE);
    setLightboxIndex(null);
  };

  return (
    <section ref={ref} className="mx-auto mt-16 mb-24 max-w-[110rem] px-4 sm:mt-20 sm:mb-32 sm:px-6">
      <div className={`reveal flex flex-wrap items-center justify-between gap-4 ${inView ? "" : "reveal-hidden"}`}>
        <SectionHeading className="mb-0">{t("sections.images")}</SectionHeading>

        <div className="relative grid grid-cols-2 gap-1 rounded-full border border-foreground/10 bg-foreground/5 p-1">
          {/* The white highlight slides between the two tabs. */}
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              activeType === "BACKDROP" ? "translate-x-0" : "translate-x-[calc(100%+0.25rem)]"
            }`}
          />
          {(["BACKDROP", "POSTER"] as const).map((imageType) => (
            <button
              key={imageType}
              type="button"
              onClick={() => switchTab(imageType)}
              className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-500 sm:px-5 sm:text-sm ${
                activeType === imageType ? "text-neutral-900" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {imageType === "BACKDROP" ? t("sections.backdrops") : t("sections.posters")}
              <span className="text-[0.625rem] font-bold tabular-nums opacity-50 sm:text-[0.6875rem]">
                {getImagesByType(images, imageType).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <BigImageLightbox
          images={visible.map((image) => ({ url: image.imageURL, type: activeType }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Keyed by tab, so switching remounts the tiles and replays their entrance. */}
      <div key={activeType} className="mt-6 grid grid-cols-2 gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {visible.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            style={hasSwitched ? { animationDelay: `${Math.min(index, 8) * 45}ms` } : undefined}
            className={`group relative w-full cursor-pointer overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 outline-none hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] hover:ring-white/30 focus-visible:ring-2 focus-visible:ring-white ${
              activeType === "BACKDROP" ? "aspect-[21.3/11.8]" : "aspect-[22/30]"
            } ${hasSwitched ? "animate-card-in" : inView ? "opacity-100" : "opacity-0"}`}
          >
            <FadeInImage
              src={tmdbImage(image.imageURL, "w1280") ?? ""}
              alt=""
              loading="lazy"
              sizes="(min-width: 1024px) 27vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />

            {/* Hover: a soft darkening and an "open full size" icon. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="pointer-events-none absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
              <Maximize2 size={14} />
            </span>
          </button>
        ))}
      </div>

      {allOfType.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setVisibleCount(isExpanded ? PAGE_SIZE : visibleCount + LOAD_MORE_STEP)}
          className="mx-auto mt-12 block w-[160px] cursor-pointer rounded-full border border-foreground/25 py-3 text-center text-xs font-bold tracking-wider text-white uppercase transition-all duration-300 hover:border-transparent hover:bg-white hover:text-neutral-900 sm:mt-16"
        >
          {isExpanded ? t("sections.showLess") : t("sections.loadMore")}
        </button>
      )}
    </section>
  );
}
