"use client";

import { useTranslation } from "@/lib/i18n/locale-context";
import { GENRE_TRANSLATIONS } from "@/lib/i18n/dictionary";

export function ListPageHeading({
  type,
  genre,
  searchTitle,
}: {
  type: "movie" | "series";
  genre?: string;
  searchTitle?: string;
}) {
  const { t, locale } = useTranslation();

  const typeLabel = type === "movie" ? t("nav.movies") : t("nav.series");
  const heading = searchTitle
    ? `${t("common.results")} "${searchTitle}"`
    : genre
      ? `${GENRE_TRANSLATIONS[genre]?.[locale] ?? genre} ${typeLabel}`
      : typeLabel;

  return (
    <div className="mx-auto flex max-w-[100rem] flex-wrap items-baseline justify-between gap-2 px-4 pt-8 pb-4 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{heading}</h1>
    </div>
  );
}
