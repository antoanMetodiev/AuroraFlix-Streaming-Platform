import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { genreLabel } from "@/lib/i18n/translate";
import { tmdbImage } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { RatingRing } from "@/components/ui/rating-ring";
import { AddToWatchlistButton } from "@/components/movies/details/add-to-watchlist-button";
import { LikeButton } from "@/components/movies/details/like-button";
import { ProgressiveBackdrop } from "@/components/movies/details/progressive-backdrop";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export async function DetailsHeader({ record, type }: { record: Movie | Series; type: "movie" | "series" }) {
  // Genres come from the backend in English; the chips show them translated.
  const locale = await getRequestLocale();
  const description = record.description ?? "";
  const poster = tmdbImage(record.posterImgURL, "w780");
  const year = record.releaseDate?.split("-")[0];
  const listType = type === "movie" ? "movies" : "series";
  const genreList = record.genres
    ? record.genres
        .split(",")
        // Some series rows store genres as `"Drama".` — strip the quotes/dot.
        .map((genre) => genre.trim().replace(/^["']+|["'.]+$/g, ""))
        .filter(Boolean)
    : [];

  return (
    <div className="relative w-full">
      {/* Cinematic banner — starts at the very top of the screen, under the
          floating header (the page is lifted 4rem in cinema-record-details-page),
          so it's 4rem taller to keep the same visible height. */}
      <div className="relative h-[calc(46vh+4rem)] min-h-[384px] w-full sm:h-[calc(56vh+4rem)] lg:h-[calc(64vh+4rem)]">
        {record.backgroundImg_URL && <ProgressiveBackdrop path={record.backgroundImg_URL} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
        {/* Only a light shade at the top, so the photo shows around the floating header. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-25% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 sm:pb-10 lg:px-8">
          <div className="mx-auto max-w-[100rem]">
            <h1 className="max-w-3xl text-3xl leading-tight font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-5xl">
              {record.title} {year && <span className="font-normal text-white/55">({year})</span>}
            </h1>

            {/* The original (English) title under a translated one — people know films by both names. */}
            {record.originalTitle && record.originalTitle !== record.title && (
              <p className="mt-1 text-base font-medium text-white/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:text-xl">
                {record.originalTitle}
              </p>
            )}

            {record.specialText && (
              <p className="mt-2 max-w-2xl text-sm text-white/70 italic sm:text-base">{record.specialText}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              {genreList.map((genre) => (
                <Link
                  key={genre}
                  href={`/${listType}/genres/${encodeURIComponent(genre)}`}
                  className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md transition-colors duration-300 hover:border-white/30 hover:bg-black/60 hover:text-white sm:text-sm"
                >
                  {genreLabel(genre, locale)}
                </Link>
              ))}
              {record.releaseDate && (
                <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md sm:text-sm">
                  {record.releaseDate}
                </span>
              )}
              {record.tmdbRating && <RatingRing value={record.tmdbRating} size="sm" className="border-2 border-white/25" />}
            </div>
          </div>
        </div>
      </div>

      {/* Poster + overview. The span fades the banner's black bottom edge into
          the page background (details-background.tsx) instead of a hard line. */}
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-[1] h-80 bg-gradient-to-b from-background via-background/70 to-transparent" />
        <div className="mx-auto flex max-w-[100rem] flex-col gap-6 px-4 pt-8 pb-10 sm:flex-row sm:px-6 sm:pb-16 lg:px-8">
          {poster && (
            <div className="relative z-10 aspect-2/3 w-32 shrink-0 overflow-hidden rounded-xl shadow-[0_0_24px_-4px_rgba(255,255,255,0.3)] ring-2 ring-black/40 sm:w-44 lg:w-52">
              <FadeInImage src={poster} alt={record.title} sizes="208px" className="object-cover" priority />
            </div>
          )}

          <div className="flex flex-1 flex-col items-start gap-3 sm:pt-2">
            {record.description && (
              <div>
                <h2 className="text-xs font-bold tracking-widest text-foreground/45 uppercase">Overview</h2>
                <p className="mt-2 max-w-3xl leading-7 text-foreground/80">{description}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <AddToWatchlistButton record={record} type={type} />
              <LikeButton record={record} type={type} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
