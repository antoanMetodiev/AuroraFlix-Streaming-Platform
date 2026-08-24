"use client";

import { WorkCarousel, type WorkCardItem } from "@/components/media/work-carousel";
import { useLastViewed } from "@/lib/use-last-viewed";

export function LastViewedSection() {
  const { items } = useLastViewed();

  if (!items || items.length === 0) return null;

  const workItems: WorkCardItem[] = items.map((entry) => ({
    key: entry.title,
    title: entry.title,
    posterURL: entry.posterURL ?? "",
    tmdbRating: entry.tmdbRating,
    type: entry.type,
    videoURL: entry.videoURL,
    tmdbId: entry.tmdbId,
  }));

  return <WorkCarousel items={workItems} mode="last-viewed" />;
}
