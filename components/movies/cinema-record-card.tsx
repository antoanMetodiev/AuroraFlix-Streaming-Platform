"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Play, Tv } from "lucide-react";
import { tmdbImage, getMovieSlug, getMovieId } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { getRatingColor } from "@/components/ui/rating-ring";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { useTranslation } from "@/lib/i18n/locale-context";
import { genreLabel } from "@/lib/i18n/translate";
import { formatReleaseDate } from "@/lib/dates";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Only fetch/show the hover preview on devices that actually have a mouse —
// touch browsers fire synthetic mouseenter on tap, which would otherwise pop
// the preview up in the way of a normal single-tap navigation.
function useHoverCapable() {
  const [capable] = useState(() => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  return capable;
}

export function CinemaRecordCard({
  record,
  type,
  eager = false,
}: {
  record: Movie | Series;
  type: "movie" | "series";
  /** Load the poster right away — for the first row; the rest load as they near the screen. */
  eager?: boolean;
}) {
  const { t, locale } = useTranslation();
  const hoverCapable = useHoverCapable();
  const href = type === "series" ? `/series/${(record as Series).tmdbId}` : `/movies/${getMovieSlug(record as Movie)}`;
  // w500: the tile is ~150–250 CSS px wide, so this stays sharp even at a
  // phone's 3x density, at about half the bytes of w780.
  const poster = tmdbImage(record.posterImgURL, "w500");
  const year = record.releaseDate?.split("-")[0];
  const rating = record.tmdbRating ? Math.max(0, Math.min(10, Number(record.tmdbRating) || 0)) : null;
  const TypeIcon = type === "movie" ? Film : Tv;
  const fullDate = formatReleaseDate(record.releaseDate, locale);
  // Up to two on the tile, kept to one line — if both don't fit, the second
  // is clipped rather than wrapping further up the poster.
  const cardGenres = (record.genres ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 2);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<Movie | Series | null>(null);
  // Which side the panel opens on — measured fresh each time it opens rather
  // than guessed from grid-column index, since the column count itself is
  // responsive (2 up to 6 depending on breakpoint). Defaults to "right";
  // flips to "left" whenever there isn't actually room on the right, which
  // covers the rightmost column at every breakpoint without hardcoding one.
  const [previewSide, setPreviewSide] = useState<"left" | "right">("right");
  // Gallery: starts pinned to the poster (the one image we already have —
  // no fetch needed, so nothing to flash-swap away from), then after a
  // 2s hold, if more images turned up, eases into cycling through them.
  // Keeping showGallery/activeIndex separate from `preview` itself means the
  // displayed image never changes the instant the fetch happens to resolve
  // — that unpredictable-timing swap was the "wrong photo first" bug.
  const [showGallery, setShowGallery] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const openTimeoutRef = useRef<number | null>(null);
  const galleryTimeoutRef = useRef<number | null>(null);
  const galleryIntervalRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const clearGalleryTimers = () => {
    if (galleryTimeoutRef.current) window.clearTimeout(galleryTimeoutRef.current);
    if (galleryIntervalRef.current) window.clearInterval(galleryIntervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) window.clearTimeout(openTimeoutRef.current);
      clearGalleryTimers();
    };
  }, []);

  const PREVIEW_WIDTH = 288;
  const PREVIEW_GAP = 12;
  const GALLERY_HOLD_MS = 2000;
  const GALLERY_INTERVAL_MS = 2800;

  const handleMouseEnter = () => {
    if (!hoverCapable) return;
    openTimeoutRef.current = window.setTimeout(() => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        const fitsOnRight = rect.right + PREVIEW_GAP + PREVIEW_WIDTH <= window.innerWidth;
        setPreviewSide(fitsOnRight ? "right" : "left");
      }
      setIsPreviewOpen(true);
      if (!preview) {
        const fetchPreview =
          type === "movie" ? getMoviePreview(getMovieId(record as Movie)) : getSeriesPreview((record as Series).tmdbId);
        fetchPreview.then((result) => result && setPreview(result));
      }
      galleryTimeoutRef.current = window.setTimeout(() => setShowGallery(true), GALLERY_HOLD_MS);
    }, 450);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) window.clearTimeout(openTimeoutRef.current);
    clearGalleryTimers();
    setIsPreviewOpen(false);
    setShowGallery(false);
    setActiveIndex(0);
  };

  // Backdrops only — the main one first, then whatever else the fetch turned
  // up, deduped. No poster: the card itself already is one, and a portrait
  // image in this 16:9 frame only shows a cropped close-up of its top.
  // Capped at 5 frames: plenty for a hover-length slideshow, keeps the DOM
  // (one <Image> per frame) small.
  const galleryImages = useMemo(() => {
    const backdrops = (preview?.imagesList ?? [])
      .filter((img) => img.imageType === "BACKDROP")
      .map((img) => tmdbImage(img.imageURL, "w780"));
    const main = tmdbImage(preview?.backgroundImg_URL, "w780");
    const ordered = [main, ...backdrops].filter((src): src is string => Boolean(src));
    return Array.from(new Set(ordered)).slice(0, 5);
  }, [preview]);

  useEffect(() => {
    if (galleryIntervalRef.current) window.clearInterval(galleryIntervalRef.current);
    if (!showGallery || galleryImages.length < 2) return;
    // First frame change lands right at the 2s mark (showGallery just
    // flipped true), not 2.8s later — matches "hold for 2s, then start
    // swapping" instead of "hold for 2s, then wait another full interval."
    // eslint-disable-next-line react-hooks/set-state-in-effect -- advances off the just-elapsed 2s hold, not something to keep re-deriving
    setActiveIndex((prev) => (prev + 1) % galleryImages.length);
    galleryIntervalRef.current = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % galleryImages.length);
    }, GALLERY_INTERVAL_MS);
    return () => {
      if (galleryIntervalRef.current) window.clearInterval(galleryIntervalRef.current);
    };
  }, [showGallery, galleryImages.length]);

  const genres = (preview?.genres ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 3);
  const tagline = preview?.specialText ?? record.specialText;
  // The full date ("9 октомври 2026 г."), not just the year the tile shows.
  const releaseDate = formatReleaseDate(preview?.releaseDate ?? record.releaseDate, locale);

  return (
    <div ref={wrapperRef} className="group/tile relative hover:z-40" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link
        href={href}
        className="group relative block w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-transform duration-500 ease-out hover:-translate-y-2"
      >
        <div className="relative aspect-2/3 w-full overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-500 ease-out group-hover:ring-white/25 group-hover:shadow-[0_30px_60px_-18px_rgba(0,0,0,0.75)]">
          {poster && (
            <Image
              src={poster}
              alt={record.title}
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 640px) 30vw, 46vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
            />
          )}

          {/* Always-on shade for the text along the bottom (tagline, title, date,
              genres): solid black at the edge, still dark a third of the way up,
              clear by two thirds — so the title reads on any poster. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black from-0% via-black/75 via-35% to-transparent to-70% transition-opacity duration-500" />
          <div className="absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-white/50 transition-opacity duration-500 group-hover:opacity-100" />

          {rating !== null && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full tabular-nums border border-white/15 bg-black/75 px-1.5 py-0.5 text-[0.625rem] font-bold sm:top-2.5 sm:right-2.5 sm:px-2 sm:py-1 sm:text-xs">
              <span aria-hidden style={{ color: getRatingColor(rating) }}>
                ★
              </span>
              <span className="text-white">{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Play affordance — a translucent ring that scales in on hover.
              No backdrop-blur on this or the badges: with ~30 cards a page,
              each blur is a layer re-rendered on every scroll frame. */}
          <div className="absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white shadow-[0_8px_28px_rgba(0,0,0,0.55)] sm:h-14 sm:w-14">
              <Play size={20} className="ml-0.5 fill-current sm:size-6" />
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 translate-y-0 p-2.5 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 sm:p-3.5">
            {record.specialText && (
              <p className="mb-0.5 line-clamp-1 font-display text-[0.6875rem] text-white/60 italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] sm:text-[0.6875rem]">
                {record.specialText}
              </p>
            )}
            <h2 className="line-clamp-2 font-display text-[0.9375rem] leading-tight font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:text-[1.0625rem]">
              {record.title}
            </h2>
            <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[0.625rem] tabular-nums font-medium text-white/60 sm:text-xs">
              <TypeIcon size={11} className="shrink-0 text-white/80" />
              <span className="shrink-0">{type === "movie" ? t("watchlist.movie") : t("watchlist.series")}</span>
              {(fullDate || year) && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="truncate">{fullDate || year}</span>
                </>
              )}
            </p>
            {cardGenres.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 overflow-hidden [max-height:1.25rem] sm:[max-height:1.375rem]">
                {cardGenres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/15 bg-black/55 px-1.5 py-px text-[0.5625rem] font-medium whitespace-nowrap text-white/75 sm:px-2 sm:text-[0.625rem]"
                  >
                    {genreLabel(genre, locale)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {hoverCapable && isPreviewOpen && (
        <Link
          href={href}
          className={`group absolute top-0 z-40 hidden w-72 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-[0_25px_55px_-15px_rgba(0,0,0,0.75)] lg:block ${
            previewSide === "right" ? "animate-card-open-right left-[calc(100%+0.75rem)]" : "animate-card-open-left right-[calc(100%+0.75rem)]"
          }`}
        >
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {galleryImages.map((src, index) => (
              <FadeInImage
                key={src}
                src={src}
                alt=""
                sizes="288px"
                className={`object-cover transition-opacity duration-700 ease-in-out ${index === (showGallery ? activeIndex : 0) ? "opacity-100" : "opacity-0"}`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          </div>

          <div className="px-3.5 pt-1 pb-3.5">
            <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground">{record.title}</h3>
            {tagline && <p className="mt-0.5 line-clamp-1 font-display text-xs text-foreground/55 italic">{tagline}</p>}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-foreground/55">
              {rating !== null && (
                <span className="flex items-center gap-1">
                  <span aria-hidden style={{ color: getRatingColor(rating) }}>
                    ★
                  </span>
                  {rating.toFixed(1)}
                </span>
              )}
              {rating !== null && releaseDate && <span className="text-foreground/25">•</span>}
              {releaseDate && <span>{releaseDate}</span>}
              <span className="text-foreground/25">•</span>
              <span className="flex items-center gap-1">
                <TypeIcon size={11} />
                {type === "movie" ? t("watchlist.movie") : t("watchlist.series")}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {preview === null ? (
                <>
                  <span className="h-5 w-14 animate-pulse rounded-full bg-foreground/10" />
                  <span className="h-5 w-16 animate-pulse rounded-full bg-foreground/10" />
                </>
              ) : (
                genres.map((genre) => (
                  <span key={genre} className="rounded-full border border-foreground/10 bg-foreground/5 px-2 py-0.5 text-[0.625rem] font-medium text-foreground/70">
                    {genreLabel(genre, locale)}
                  </span>
                ))
              )}
            </div>

            <div className="mt-2.5">
              {preview === null ? (
                <div className="flex flex-col gap-1.5">
                  <span className="h-2.5 w-full animate-pulse rounded-full bg-foreground/10" />
                  <span className="h-2.5 w-4/5 animate-pulse rounded-full bg-foreground/10" />
                </div>
              ) : (
                preview.description && <p className="line-clamp-2 text-xs leading-relaxed text-foreground/60">{preview.description}</p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 transition-transform duration-200 group-hover:scale-[1.02]">
              <Play size={12} className="fill-current" />
              {t("hero.watchNow")}
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
