"use client";

import { useWatchlist } from "@/lib/use-watchlist";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export function AddToWatchlistButton({ record, type }: { record: Movie | Series; type: "movie" | "series" }) {
  const { t } = useTranslation();
  const { has, add, isLoading } = useWatchlist();
  const added = has(record.id);

  return (
    <button
      type="button"
      disabled={added || isLoading}
      onClick={() => {
        const videoId = record.videoURL?.split("/")[5] ?? "";
        add({
          id: record.id,
          tmdbId: record.tmdbId,
          title: record.title,
          posterImgURL: record.posterImgURL,
          tmdbRating: record.tmdbRating,
          type: type === "movie" ? "MOVIE" : "TV-SHOW",
          videoId: type === "movie" ? videoId : "",
        });
      }}
      className={`mt-2 inline-flex w-fit items-center justify-center gap-2 self-end rounded-xl px-5 py-3 text-sm font-semibold tracking-wide whitespace-nowrap shadow-[0_8px_20px_rgba(255,255,255,0.3)] transition-all duration-200 hover:-translate-y-0.5 disabled:hover:translate-y-0 ${
        added
          ? "cursor-default border border-foreground/15 bg-foreground/10 text-foreground/70"
          : "bg-white text-neutral-900 hover:shadow-[0_12px_28px_rgba(255,255,255,0.4)]"
      }`}
    >
      {added ? t("watchlistButton.added") : t("watchlistButton.add")}
    </button>
  );
}
