"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Loader } from "@/components/ui/loader";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { MAX_WATCHLIST_ITEMS, type WatchlistItem } from "@/lib/watchlist";
import { useWatchlist } from "@/lib/use-watchlist";
import { useTranslation } from "@/lib/i18n/locale-context";

export function WatchlistView() {
  const { t } = useTranslation();
  const { items, isLoading, remove } = useWatchlist();

  const handleRemove = (item: WatchlistItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    remove(item.id);
  };

  return (
    <div className="relative min-h-screen w-full bg-background">
      <div className="mx-auto max-w-[100rem] px-4 pt-8 pb-16 sm:px-6 sm:pt-14 lg:px-8">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 sm:mb-14">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{t("watchlist.title")}</h1>
            <p className="mt-2 max-w-md text-sm text-foreground/50">{t("watchlist.subtitle", { max: MAX_WATCHLIST_ITEMS })}</p>
          </div>

          {items && items.length > 0 && (
            <span className="rounded-full border border-foreground/15 bg-foreground/10 px-4 py-2 text-sm font-medium text-foreground/80 backdrop-blur-md">
              {items.length} {t("watchlist.saved")}
            </span>
          )}
        </div>

        {isLoading || !items ? (
          <Loader />
        ) : items.length === 0 ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
            <h2 className="text-xl font-semibold text-foreground">{t("watchlist.emptyTitle")}</h2>
            <p className="text-sm text-foreground/50">{t("watchlist.emptyDesc")}</p>
            <Link
              href="/movies"
              className="mt-3 rounded-full bg-linear-to-br from-[#4a00e0] to-[#8e2de2] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-4px_rgba(142,45,226,0.5)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              {t("watchlist.browseMovies")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => {
              const isSeries = item.type === "TV-SHOW";
              const href = isSeries
                ? `/series/${item.tmdbId}`
                : `/movies/${getMovieSlug({ title: item.title ?? "", movieId: item.videoId })}`;
              const poster = tmdbImage(item.posterImgURL, "w500");

              return (
                <Link
                  key={item.id}
                  href={href}
                  className="group relative block w-full overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-white/30 hover:shadow-[0_20px_45px_-15px_rgba(142,45,226,0.5)]"
                >
                  <div className="relative aspect-2/3 w-full overflow-hidden">
                    {poster && (
                      <FadeInImage
                        src={poster}
                        alt={item.title ?? ""}
                        sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 640px) 30vw, 46vw"
                        className="object-cover group-hover:scale-108"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

                    {item.tmdbRating && (
                      <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white backdrop-blur-md sm:top-2.5 sm:left-2.5">
                        ★ {Number(item.tmdbRating).toFixed(1)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(event) => handleRemove(item, event)}
                      aria-label={t("watchlist.removeAria")}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-100 backdrop-blur-md transition-all duration-200 hover:bg-red-500/90 sm:top-2.5 sm:right-2.5 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3.5">
                      <h2 className="line-clamp-2 text-sm leading-tight font-semibold text-white sm:text-base">{item.title}</h2>
                      <p className="mt-1 text-[11px] font-medium text-white/55 sm:text-xs">{isSeries ? t("watchlist.series") : t("watchlist.movie")}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
