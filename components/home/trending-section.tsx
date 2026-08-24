"use client";

import { MarqueeRow } from "@/components/home/marquee-row";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { MarqueeItem } from "@/lib/data/home-marquee";

export function TrendingSection({ movies, series }: { movies: MarqueeItem[]; series: MarqueeItem[] }) {
  const { t } = useTranslation();

  return (
    <section aria-label={t("home.trendingAria")} className="relative z-10 bg-background pt-14 pb-8 sm:pt-20 sm:pb-10">
      <div>
        <SectionHeading className="px-4 sm:px-6 lg:px-8">{t("home.popularMovies")}</SectionHeading>
        <MarqueeRow items={movies} hrefBase="/movies" direction="left" ariaLabel={t("home.trendingMoviesAria")} />
      </div>

      <div className="mt-14 sm:mt-20">
        <SectionHeading className="px-4 sm:px-6 lg:px-8">{t("home.popularShows")}</SectionHeading>
        <MarqueeRow items={series} hrefBase="/series" direction="right" ariaLabel={t("home.trendingSeriesAria")} />
      </div>
    </section>
  );
}
