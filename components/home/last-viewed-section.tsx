"use client";

import { WorkCarousel, type WorkCardItem } from "@/components/media/work-carousel";
import { useLastViewed } from "@/lib/use-last-viewed";
import { useInViewOnce } from "@/lib/use-in-view-once";

export function LastViewedSection() {
  const { items } = useLastViewed();
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

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

  return (
    <div ref={ref} className={`reveal ${inView ? "" : "reveal-hidden"}`}>
      <WorkCarousel items={workItems} mode="last-viewed" />
    </div>
  );
}
