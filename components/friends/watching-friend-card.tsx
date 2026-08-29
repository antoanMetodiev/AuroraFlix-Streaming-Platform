"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Star, Tv } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { WatchingTarget } from "@/lib/watching";
import type { Friend } from "@/lib/friends";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

function hrefFor(watching: WatchingTarget) {
  return watching.type === "movie"
    ? `/movies/${getMovieSlug({ title: watching.title, tmdbId: watching.tmdbId })}`
    : `/series/${watching.tmdbId}`;
}

/**
 * One friend's "currently watching" row, full detail always shown (no
 * separate hover state) — used inside an already-open popover/sheet, so
 * unlike WatchingFriendsSidebar's rail item there's no compact form to
 * expand from. Fetches its own poster/genres/rating/description preview on
 * mount (cached by id in lib/api-public.ts), same data WatchingSidebarItem
 * and WatchingToastManager both already pull from for the same reason.
 */
export function WatchingFriendCard({ friend, watching, onNavigate }: { friend: Friend; watching: WatchingTarget; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const key = `${watching.type}:${watching.tmdbId}`;
  const [resolved, setResolved] = useState<{ key: string; data: Movie | Series | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPreview = watching.type === "movie" ? getMoviePreview(watching.tmdbId) : getSeriesPreview(watching.tmdbId);
    fetchPreview.then((data) => {
      if (!cancelled) setResolved({ key, data });
    });
    return () => {
      cancelled = true;
    };
  }, [key, watching.type, watching.tmdbId]);

  const loaded = resolved?.key === key;
  const preview = loaded ? resolved.data : null;
  const TypeIcon = watching.type === "movie" ? Film : Tv;
  const poster = tmdbImage(preview?.posterImgURL, "w342");
  const rating = preview?.tmdbRating ? Number(preview.tmdbRating) : null;
  const genres = (preview?.genres ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <Link
      href={hrefFor(watching)}
      onClick={onNavigate}
      className="flex gap-2.5 rounded-2xl p-2 transition-colors duration-150 hover:bg-foreground/5"
    >
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-foreground/10">
        {poster ? (
          <FadeInImage src={poster} alt="" sizes="56px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/30">
            <TypeIcon size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Avatar src={friend.profileImageURL} name={friend.displayName} size={16} />
          <span className="truncate text-[11px] font-medium text-foreground/55">{friend.displayName || "?"}</span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          {t("friends.watching")}
        </p>
        <p className="truncate text-sm font-semibold text-foreground/90">{watching.title}</p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {rating !== null && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-400">
              <Star size={9} className="fill-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          {!loaded ? (
            <span className="h-3.5 w-12 animate-pulse rounded-full bg-foreground/10" />
          ) : (
            genres.map((genre) => (
              <span key={genre} className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-medium text-foreground/60">
                {genre}
              </span>
            ))
          )}
        </div>
      </div>
    </Link>
  );
}
