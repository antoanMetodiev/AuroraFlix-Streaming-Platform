"use client";

import Link from "next/link";
import { Clapperboard, Trash2, Tv } from "lucide-react";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { RatingRing } from "@/components/ui/rating-ring";
import { useTranslation } from "@/lib/i18n/locale-context";

/**
 * A saved title's poster, in the filmography cards' style (actor page): type
 * badge, rating ring, title over a dark fade. The remove button shows on
 * hover where the rating sits (on touch screens it stays, in the rating's place).
 */
export function LibraryPosterCard({
  href,
  title,
  poster,
  rating,
  isSeries,
  onRemove,
  removeLabel,
  onNavigate,
  index = 0,
  eager = false,
  sizes = "(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw",
  compact = false,
}: {
  href: string;
  title: string;
  poster?: string | null;
  rating?: string | null;
  isSeries: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  onNavigate?: () => void;
  index?: number;
  eager?: boolean;
  sizes?: string;
  /** Smaller type and badges — for the denser playlist grids. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const value = Number(rating);
  const hasRating = Number.isFinite(value) && value > 0;

  return (
    <div className="group animate-card-in relative" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <Link href={href} onClick={onNavigate} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_18px_40px_-12px_rgba(255,255,255,0.35)] group-hover:ring-white/35">
          {poster && (
            <FadeInImage
              src={poster}
              alt={title}
              loading={eager ? "eager" : "lazy"}
              sizes={sizes}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

          <span
            className={`absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/70 font-semibold tracking-wide text-white/90 uppercase backdrop-blur-sm ${
              compact ? "px-1.5 py-0.5 text-[0.5625rem]" : "px-2 py-0.5 text-[0.625rem]"
            }`}
          >
            {isSeries ? <Tv size={compact ? 10 : 11} /> : <Clapperboard size={compact ? 10 : 11} />}
            {isSeries ? t("watchlist.series") : t("watchlist.movie")}
          </span>

          {hasRating && (
            <RatingRing
              value={value}
              size="xs"
              className={`absolute top-2 right-2 transition-opacity duration-300 ${onRemove ? "max-sm:hidden sm:group-hover:opacity-0" : ""}`}
            />
          )}

          <div className={`absolute inset-x-0 bottom-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${compact ? "p-2.5" : "p-3"}`}>
            <p className={`line-clamp-2 leading-snug font-semibold text-white ${compact ? "text-xs" : "text-sm"}`}>{title}</p>
          </div>
        </div>
      </Link>

      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
          title={removeLabel}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-red-400/60 hover:bg-red-500/90 sm:opacity-0 sm:group-hover:-translate-y-1.5 sm:group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
