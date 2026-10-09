"use client";

import { WorkCarousel, type WorkCardItem } from "@/components/media/work-carousel";
import { useTranslation } from "@/lib/i18n/locale-context";

export function PopularCarousels({ movies, series }: { movies: WorkCardItem[]; series: WorkCardItem[] }) {
  const { t } = useTranslation();

  return (
    <>
      <WorkCarousel items={movies} mode="popular" heading={t("home.popularMovies")} />
      <WorkCarousel items={series} mode="popular" heading={t("home.popularShows")} />
    </>
  );
}
