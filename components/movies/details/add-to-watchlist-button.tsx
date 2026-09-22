"use client";

import { Bookmark } from "lucide-react";
import { useWatchlist } from "@/lib/use-watchlist";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Compact toggle, same shape as LikeButton — added stays disabled rather
// than toggling off, since removal happens from the /watchlist page itself.
export function AddToWatchlistButton({
  record,
  type,
  variant = "default",
}: {
  record: Movie | Series;
  type: "movie" | "series";
  // "overlay" drops the details-page layout classes (mt-2/self-end) and
  // shrinks the hit area for use on top of a poster — see CinemaRecordCard.
  variant?: "default" | "overlay";
}) {
  const { t } = useTranslation();
  const { has, add, isLoading } = useWatchlist();
  const added = has(record.id);

  const handleAdd = () => {
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
  };

  return (
    <button
      type="button"
      disabled={added || isLoading}
      onClick={handleAdd}
      aria-pressed={added}
      aria-label={added ? t("watchlistButton.added") : t("watchlistButton.add")}
      className={`flex shrink-0 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${
        variant === "overlay" ? "h-8 w-8 backdrop-blur-md" : "mt-2 h-11 w-11 self-end"
      } ${
        added
          ? "cursor-default border-transparent bg-white text-neutral-900"
          : variant === "overlay"
            ? // Sits on top of a poster, so it needs its own contrast rather
              // than the page-background-relative foreground/N tints.
              "border-white/25 bg-black/60 text-white hover:bg-black/80"
            : "border-foreground/15 bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
      } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
    >
      <Bookmark size={variant === "overlay" ? 14 : 18} className={added ? "fill-current" : ""} />
    </button>
  );
}
