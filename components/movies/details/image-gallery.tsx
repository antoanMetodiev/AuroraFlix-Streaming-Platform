"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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

  const allOfType = getImagesByType(images, activeType);
  const visible = allOfType.slice(0, visibleCount);
  const isExpanded = visible.length === allOfType.length && allOfType.length > PAGE_SIZE;

  if (images.length === 0) return null;

  const switchTab = (type: ImageType) => {
    setActiveType(type);
    setVisibleCount(PAGE_SIZE);
    setLightboxIndex(null);
  };

  return (
    <section ref={ref} className="mx-auto mt-16 mb-24 max-w-[110rem] px-4 sm:mt-20 sm:mb-32 sm:px-6">
      <div className={`flex flex-wrap items-center justify-between gap-4 transition-opacity duration-500 ${inView ? "opacity-100" : "opacity-0"}`}>
        <SectionHeading className="mb-0">{t("sections.images")}</SectionHeading>

        <div className="flex gap-1 rounded-full border border-foreground/10 bg-foreground/5 p-1">
          {(["BACKDROP", "POSTER"] as const).map((imageType) => (
            <button
              key={imageType}
              type="button"
              onClick={() => switchTab(imageType)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 sm:px-5 sm:text-sm ${
                activeType === imageType ? "bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {imageType === "BACKDROP" ? t("sections.backdrops") : t("sections.posters")}
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

      <div className="mt-6 grid grid-cols-2 gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {visible.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className={`relative w-full overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 hover:scale-95 hover:ring-white/30 ${
              activeType === "BACKDROP" ? "aspect-[21.3/11.8]" : "aspect-[22/30]"
            } ${inView ? "opacity-100" : "opacity-0"}`}
          >
            <FadeInImage
              src={tmdbImage(image.imageURL, "w1280") ?? ""}
              alt=""
              loading="lazy"
              sizes="(min-width: 1024px) 27vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {allOfType.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setVisibleCount(isExpanded ? PAGE_SIZE : visibleCount + LOAD_MORE_STEP)}
          className="mx-auto mt-12 block w-[160px] rounded-full border border-foreground/25 py-3 text-center text-xs font-bold tracking-wider text-white uppercase transition-all duration-300 hover:border-transparent hover:bg-linear-to-br hover:from-[#4a00e0] hover:to-[#8e2de2] sm:mt-16"
        >
          {isExpanded ? t("sections.showLess") : t("sections.loadMore")}
        </button>
      )}
    </section>
  );
}
