"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useLikes } from "@/lib/use-likes";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Compact toggle, deliberately smaller/secondary next to AddToWatchlistButton.
export function LikeButton({ record, type }: { record: Movie | Series; type: "movie" | "series" }) {
  const { t } = useTranslation();
  const { has, add, remove, isLoading } = useLikes();
  const liked = has(record.id);
  const [showLimitMessage, setShowLimitMessage] = useState(false);

  useEffect(() => {
    if (!showLimitMessage) return;
    const timeout = window.setTimeout(() => setShowLimitMessage(false), 3500);
    return () => window.clearTimeout(timeout);
  }, [showLimitMessage]);

  const toggle = async () => {
    if (liked) {
      remove(record.id);
      return;
    }
    const videoId = record.videoURL?.split("/")[5] ?? "";
    const result = await add({
      id: record.id,
      tmdbId: record.tmdbId,
      title: record.title,
      posterImgURL: record.posterImgURL,
      tmdbRating: record.tmdbRating,
      type: type === "movie" ? "MOVIE" : "TV-SHOW",
      videoId: type === "movie" ? videoId : "",
    });
    if (result === "limit") setShowLimitMessage(true);
  };

  return (
    <div className="relative mt-2 self-end">
      <button
        type="button"
        disabled={isLoading}
        onClick={toggle}
        aria-pressed={liked}
        aria-label={liked ? t("likeButton.liked") : t("likeButton.like")}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 ${
          liked ? "border-transparent bg-white text-neutral-900" : "border-foreground/15 bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
        }`}
      >
        <Heart size={18} className={liked ? "fill-current" : ""} />
      </button>

      {showLimitMessage && (
        <div
          role="status"
          className="animate-modal-card-in absolute top-full right-0 z-20 mt-2 w-56 rounded-xl border border-foreground/15 bg-surface px-3.5 py-2.5 text-xs font-medium text-foreground/80 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          style={{ animationDuration: "0.2s" }}
        >
          {t("likeButton.limitReached")}
        </div>
      )}
    </div>
  );
}
