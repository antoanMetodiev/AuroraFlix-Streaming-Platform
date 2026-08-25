"use client";

import { Play } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Episode } from "@/types/episode";

export function EpisodeCard({ episode, onSelect }: { episode: Episode; onSelect: () => void }) {
  const { t } = useTranslation();
  const description =
    episode.description && episode.description.length > 219 ? `${episode.description.slice(0, 219)}..` : episode.description;
  const poster = tmdbImage(episode.posterImgURL, "w1280");

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full flex-col overflow-hidden rounded-2xl bg-foreground/5 text-left ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:bg-foreground/10 hover:ring-foreground/30 hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.35)]"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {poster && (
          <FadeInImage
            src={poster}
            alt=""
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/40">
          <span className="flex h-11 w-11 scale-75 items-center justify-center rounded-full bg-white/90 text-black opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Play size={18} className="ml-0.5" fill="currentColor" />
          </span>
        </div>
        {episode.tmdbRating && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white backdrop-blur-md">
            ★ {Number(episode.tmdbRating).toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground sm:text-base">
            <span className="text-foreground/50">{episode.episodeNumber}.</span> {episode.episodeTitle}
          </h3>
        </div>
        <p className="text-xs text-foreground/45">
          {episode.airDate}
          {episode.runtime && (
            <span>
              {" "}
              • {episode.runtime} {t("common.minutes")}
            </span>
          )}
        </p>
        {description && <p className="line-clamp-3 text-xs leading-relaxed text-foreground/60 sm:text-sm">{description}</p>}
      </div>
    </button>
  );
}
