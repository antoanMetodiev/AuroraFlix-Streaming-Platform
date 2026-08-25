"use client";

import Link from "next/link";
import { Film, Play, Tv } from "lucide-react";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { getRatingColor } from "@/components/ui/rating-ring";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export function CinemaRecordCard({ record, type }: { record: Movie | Series; type: "movie" | "series" }) {
  const { t } = useTranslation();
  const href = type === "series" ? `/series/${(record as Series).tmdbId}` : `/movies/${getMovieSlug(record as Movie)}`;
  const poster = tmdbImage(record.posterImgURL, "w780");
  const year = record.releaseDate?.split("-")[0];
  const rating = record.tmdbRating ? Math.max(0, Math.min(10, Number(record.tmdbRating) || 0)) : null;
  const TypeIcon = type === "movie" ? Film : Tv;

  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-transform duration-500 ease-out hover:-translate-y-2"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-500 ease-out group-hover:ring-white/25 group-hover:shadow-[0_30px_60px_-18px_rgba(0,0,0,0.75)]">
        {poster && (
          <FadeInImage
            src={poster}
            alt={record.title}
            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 640px) 30vw, 46vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
          />
        )}

        {/* Always-on vignette for text legibility, deepened a touch on hover. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent transition-opacity duration-500 group-hover:from-black/98" />
        <div className="absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-white/50 transition-opacity duration-500 group-hover:opacity-100" />

        {rating !== null && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-md sm:top-2.5 sm:right-2.5 sm:px-2 sm:py-1 sm:text-xs">
            <span aria-hidden style={{ color: getRatingColor(rating) }}>
              ★
            </span>
            <span className="text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Play affordance — glassmorphic ring that scales in on hover. */}
        <div className="absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-md sm:h-14 sm:w-14">
            <Play size={20} className="ml-0.5 fill-current sm:size-6" />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 translate-y-0 p-2.5 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 sm:p-3.5">
          <h2 className="line-clamp-2 text-sm leading-tight font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:text-base">
            {record.title}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/60 sm:text-xs">
            <TypeIcon size={11} className="shrink-0 text-white/80" />
            {type === "movie" ? t("watchlist.movie") : t("watchlist.series")}
            {year && (
              <>
                <span className="text-white/30">•</span>
                {year}
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
