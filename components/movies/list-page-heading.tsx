"use client";

import { useTranslation } from "@/lib/i18n/locale-context";
import { genreLabel } from "@/lib/i18n/translate";
import { genreHeading } from "@/lib/seo";

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
  // In Bulgarian, the same search phrases the page's <title> targets (see
  // lib/seo.ts) — "Онлайн филми", "Екшън филми" — rather than a bare label.
  const heading = searchTitle
    ? `${t("common.results")} "${searchTitle}"`
    : locale === "bg"
      ? genre
        ? genreHeading(genre, type)
        : type === "movie"
          ? "Онлайн филми"
          : "Онлайн сериали"
      : genre
        ? locale === "en"
          ? `${genreLabel(genre, locale)} ${typeLabel}`
          : // Greek / Spanish genre names are adjectives or nouns that don't
            // simply prefix the type ("Películas de acción") — keep it neutral.
            `${typeLabel}: ${genreLabel(genre, locale)}`
        : typeLabel;

  return (
    <div className="mx-auto flex max-w-[100rem] flex-wrap items-baseline justify-between gap-2 px-4 pt-8 pb-4 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{heading}</h1>
    </div>
  );
}
