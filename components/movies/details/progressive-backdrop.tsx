"use client";

import { tmdbImage } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { useMediaQuery } from "@/lib/use-media-query";
import { useProgressiveImage } from "@/lib/use-progressive-image";

export function ProgressiveBackdrop({ path }: { path: string }) {
  // The multi-MB original only pays off on big screens; phones and laptops
  // stay on w1280, which already covers them.
  const isLargeScreen = useMediaQuery("(min-width: 1600px)");
  const { src, isHighRes } = useProgressiveImage(tmdbImage(path, "w1280"), isLargeScreen ? tmdbImage(path, "original") : null);
  if (!src) return null;

  return (
    <FadeInImage
      key={src}
      src={src}
      alt=""
      unoptimized={isHighRes}
      priority
      sizes="100vw"
      className="object-cover"
    />
  );
}
