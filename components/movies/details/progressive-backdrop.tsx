"use client";

import { tmdbImage } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { useProgressiveImage } from "@/lib/use-progressive-image";

export function ProgressiveBackdrop({ path }: { path: string }) {
  const { src, isHighRes } = useProgressiveImage(tmdbImage(path, "w1280"), tmdbImage(path, "original"));
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
