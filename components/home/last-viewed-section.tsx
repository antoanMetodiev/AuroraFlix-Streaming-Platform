"use client";

import { WorkCarousel, type WorkCardItem } from "@/components/media/work-carousel";
import { useTranslation } from "@/lib/i18n/locale-context";
import { useLastViewed } from "@/lib/use-last-viewed";
import { titleKind, useLocalizedTitles } from "@/lib/use-localized-titles";
import { latestProgress, progressPercent, useWatchProgress } from "@/lib/watch-progress";

export function LastViewedSection() {
  const { t } = useTranslation();
  const { items } = useLastViewed();
  const progress = useWatchProgress();
  // Each entry keeps the title / poster from when it was opened — show the
  // catalog's current ones in the visitor's language instead.
  const localized = useLocalizedTitles((items ?? []).map((entry) => ({ kind: titleKind(entry.type), tmdbId: entry.tmdbId })));

  if (!items || items.length === 0) return null;

  const workItems: WorkCardItem[] = items.map((entry) => {
    const current = localized(titleKind(entry.type), entry.tmdbId);
    const latest = entry.tmdbId
      ? latestProgress(progress, entry.type === "SERIES" ? "tv" : "movie", entry.tmdbId)
      : null;
    return {
      key: entry.tmdbId ? `${entry.type}:${entry.tmdbId}` : entry.title,
      title: current?.title ?? entry.title,
      posterURL: current?.posterImgURL || entry.posterURL || "",
      tmdbRating: entry.tmdbRating,
      type: entry.type,
      videoURL: entry.videoURL,
      tmdbId: entry.tmdbId,
      progressPercent: latest && !latest.finished ? progressPercent(latest) : null,
      progressLabel: latest?.season
        ? t("carousel.episodeShort", { season: latest.season, episode: latest.episode ?? "" })
        : null,
    };
  });

  return <WorkCarousel items={workItems} mode="last-viewed" />;
}
