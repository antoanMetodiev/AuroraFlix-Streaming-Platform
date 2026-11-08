"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, Bookmark, Clapperboard, Search, Sparkles, Star, Tv, X } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Loader } from "@/components/ui/loader";
import { LibraryHero, type LibraryStat } from "@/components/library/library-hero";
import { LibraryPosterCard } from "@/components/library/library-poster-card";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { MAX_WATCHLIST_ITEMS } from "@/lib/watchlist";
import { useWatchlist } from "@/lib/use-watchlist";
import { useLocalizedItems } from "@/lib/use-localized-titles";
import { useTranslation } from "@/lib/i18n/locale-context";

/** One full row at the widest breakpoint (6 columns). */
const EAGER_POSTERS = 6;

type Filter = "all" | "movies" | "series";
type Sort = "recent" | "rating" | "title";

/** Lower-cased, accents stripped — "pokemon" finds "Pokémon". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase().trim();
}

export function WatchlistView() {
  const { t, locale } = useTranslation();
  const { items: savedItems, isLoading, remove } = useWatchlist();
  // Titles / posters in the language the visitor uses now (see useLocalizedItems).
  const items = useLocalizedItems(savedItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");

  const list = useMemo(() => items ?? [], [items]);
  const counts = useMemo(() => {
    const series = list.filter((item) => item.type === "TV-SHOW").length;
    return { all: list.length, movies: list.length - series, series };
  }, [list]);
  const averageRating = useMemo(() => {
    const ratings = list.map((item) => Number(item.tmdbRating)).filter((value) => Number.isFinite(value) && value > 0);
    return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
  }, [list]);

  const needle = normalize(query);
  const shown = useMemo(() => {
    const filtered = list.filter(
      (item) =>
        (filter === "all" || (filter === "series" ? item.type === "TV-SHOW" : item.type !== "TV-SHOW")) &&
        (!needle || normalize(item.title ?? "").includes(needle) || normalize(item.originalTitle ?? "").includes(needle))
    );
    if (sort === "rating") return [...filtered].sort((a, b) => (Number(b.tmdbRating) || 0) - (Number(a.tmdbRating) || 0));
    if (sort === "title") return [...filtered].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", locale));
    return filtered; // already newest first
  }, [list, filter, sort, needle, locale]);

  const stats: LibraryStat[] = items
    ? [
        { Icon: Bookmark, label: t("watchlist.statSaved"), value: `${counts.all} / ${MAX_WATCHLIST_ITEMS}`, progress: counts.all / MAX_WATCHLIST_ITEMS },
        { Icon: Clapperboard, label: t("nav.movies"), value: String(counts.movies) },
        { Icon: Tv, label: t("nav.series"), value: String(counts.series) },
        { Icon: Star, label: t("watchlist.statRating"), value: averageRating ? averageRating.toFixed(1) : "—" },
      ]
    : [];

  const tabs = [
    { value: "all" as const, label: t("actor.filterAll"), count: counts.all, Icon: Sparkles },
    { value: "movies" as const, label: t("nav.movies"), count: counts.movies, Icon: Clapperboard },
    { value: "series" as const, label: t("nav.series"), count: counts.series, Icon: Tv },
  ];
  const sorts: { value: Sort; label: string }[] = [
    { value: "recent", label: t("watchlist.sortRecent") },
    { value: "rating", label: t("watchlist.sortRating") },
    { value: "title", label: t("watchlist.sortTitle") },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <div className="mx-auto max-w-[100rem] px-4 pt-10 pb-20 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
        <LibraryHero
          title={t("watchlist.title")}
          subtitle={counts.all >= MAX_WATCHLIST_ITEMS ? `${t("watchlist.full")} — ${t("watchlist.subtitle", { max: MAX_WATCHLIST_ITEMS })}` : t("watchlist.subtitle", { max: MAX_WATCHLIST_ITEMS })}
          stats={list.length > 0 ? stats : []}
          backdropPoster={list[0]?.posterImgURL ? tmdbImage(list[0].posterImgURL, "w780") : null}
        />

        {isLoading || !items ? (
          <Loader />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
              {counts.movies > 0 && counts.series > 0 ? (
                <div className="inline-flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm">
                  {tabs.map(({ value, label, count, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-300 ${
                        filter === value ? "bg-white text-neutral-900 shadow-[0_4px_16px_-4px_rgba(255,255,255,0.5)]" : "text-foreground/65 hover:text-foreground"
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                      <span className={filter === value ? "text-neutral-500" : "text-foreground/40"}>{count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <span aria-hidden className="hidden lg:block" />
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-foreground/40" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Escape" && setQuery("")}
                    placeholder={t("watchlist.searchPlaceholder")}
                    aria-label={t("watchlist.searchPlaceholder")}
                    autoComplete="off"
                    className="w-full rounded-full border border-white/10 bg-white/[0.05] py-2.5 pr-10 pl-11 text-sm text-foreground placeholder:text-foreground/35 outline-none backdrop-blur-sm transition-all duration-300 [&::-webkit-search-cancel-button]:hidden focus:border-transparent focus:bg-white/[0.08] focus:shadow-[0_0_0_1.5px_#ffffff]"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label={t("watchlist.clearSearch")}
                      className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-white/10 hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm" role="group" aria-label={t("watchlist.sortLabel")}>
                  <ArrowDownWideNarrow size={14} className="mx-2 shrink-0 text-foreground/40" aria-hidden />
                  {sorts.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSort(value)}
                      aria-pressed={sort === value}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                        sort === value ? "bg-white text-neutral-900" : "text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-foreground/60">
                {t("watchlist.noMatches", { query: query.trim() })}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {shown.map((item, index) => {
                  const isSeries = item.type === "TV-SHOW";
                  const href = isSeries
                    ? `/series/${item.tmdbId}`
                    : `/movies/${getMovieSlug({ title: item.title ?? "", originalTitle: item.originalTitle, tmdbId: item.tmdbId, movieId: item.videoId })}`;
                  return (
                    <LibraryPosterCard
                      key={item.id}
                      href={href}
                      title={item.title ?? ""}
                      poster={tmdbImage(item.posterImgURL, "w500")}
                      rating={item.tmdbRating}
                      isSeries={isSeries}
                      onRemove={() => remove(item.id)}
                      removeLabel={t("watchlist.removeAria")}
                      index={index}
                      eager={index < EAGER_POSTERS}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Fades the page background out into the footer's solid black. */}
      <div aria-hidden className="pointer-events-none relative -z-[1] -mt-48 h-48 bg-gradient-to-b from-transparent to-background" />
      <Footer />
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="animate-card-in relative mx-auto flex max-w-xl flex-col items-center overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent px-6 py-14 text-center">
      <span aria-hidden className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-neutral-900 shadow-[0_10px_30px_-8px_rgba(255,255,255,0.55)]">
        <Bookmark size={26} />
      </span>
      <h2 className="relative mt-6 font-display text-2xl font-semibold text-foreground sm:text-3xl">{t("watchlist.emptyTitle")}</h2>
      <p className="relative mt-2 max-w-sm text-sm text-foreground/55">{t("watchlist.emptyDesc")}</p>
      <div className="relative mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/movies"
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          <Clapperboard size={15} />
          {t("watchlist.browseMovies")}
        </Link>
        <Link
          href="/series"
          className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-foreground/85 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-neutral-900"
        >
          <Tv size={15} />
          {t("watchlist.browseSeries")}
        </Link>
      </div>
    </div>
  );
}
