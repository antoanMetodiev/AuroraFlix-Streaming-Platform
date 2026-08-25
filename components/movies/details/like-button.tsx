"use client";

import { Heart } from "lucide-react";
import { useLikes } from "@/lib/use-likes";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Compact toggle, deliberately smaller/secondary next to AddToWatchlistButton
// — no listing UI for likes yet (per the user, 2026-08), just the toggle itself.
export function LikeButton({ record, type }: { record: Movie | Series; type: "movie" | "series" }) {
  const { t } = useTranslation();
  const { has, add, remove, isLoading } = useLikes();
  const liked = has(record.id);

  const toggle = () => {
    if (liked) {
      remove(record.id);
      return;
    }
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
      disabled={isLoading}
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? t("likeButton.liked") : t("likeButton.like")}
      className={`mt-2 flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl border transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 ${
        liked ? "border-transparent bg-white text-neutral-900" : "border-foreground/15 bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
      }`}
    >
      <Heart size={18} className={liked ? "fill-current" : ""} />
    </button>
  );
}
