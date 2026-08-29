"use client";

import { useState } from "react";
import Link from "next/link";
import { Film, Play, Star, Tv } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { useFriends } from "@/lib/use-friends";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { WatchingTarget } from "@/lib/watching";
import type { Friend } from "@/lib/friends";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// How many rows the rail shows before just stopping — no "+N", unlike the
// header cluster's overflow pill, since there's no natural place to put one
// in a vertical list without it looking like just another (blank) friend.
const MAX_SIDEBAR_FRIENDS = 6;

function hrefFor(watching: WatchingTarget) {
  return watching.type === "movie"
    ? `/movies/${getMovieSlug({ title: watching.title, tmdbId: watching.tmdbId })}`
    : `/series/${watching.tmdbId}`;
}

/**
 * Facebook-style "active now" rail — persistently shows which friends are
 * watching what, no need to open the friends panel to see it. Desktop (xl+)
 * only; there's no room for a fixed rail on narrower screens, so
 * FriendsNavButton's header avatar cluster (tap-to-open popover there
 * instead of hover) is the mobile/tablet equivalent of this.
 *
 * Deliberately renders nothing at all when no one is watching anything,
 * same as the header cluster — an empty rail sitting on the edge of the
 * screen would just be dead chrome.
 */
export function WatchingFriendsSidebar() {
  const { friends, watching } = useFriends();
  // Capped rather than made scrollable — a scroll container needs
  // overflow-y, and per the CSS overflow spec setting only one axis forces
  // the OTHER to compute as "auto" too (never "visible") whenever it isn't
  // already non-visible: https://www.w3.org/TR/CSS22/visufx.html#overflow
  // ("if one is visible and other isn't, visible behaves as auto"). That
  // silently clipped the hover flyout below, which deliberately overflows
  // this rail's own bounds to the right (left-full) — a capped, unscrolled
  // list sidesteps the whole issue instead of fighting it with a portal.
  const watchingFriends = friends.filter((friend) => watching[friend.clerkId]).slice(0, MAX_SIDEBAR_FRIENDS);

  if (watchingFriends.length === 0) return null;

  return (
    <div className="fixed top-1/2 left-4 z-30 hidden -translate-y-1/2 flex-col gap-2.5 xl:flex">
      {watchingFriends.map((friend) => (
        <WatchingSidebarItem key={friend.clerkId} friend={friend} watching={watching[friend.clerkId]} />
      ))}
    </div>
  );
}

function WatchingSidebarItem({ friend, watching }: { friend: Friend; watching: WatchingTarget }) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [preview, setPreview] = useState<{ data: Movie | Series | null; loaded: boolean }>({ data: null, loaded: false });

  const href = hrefFor(watching);
  const TypeIcon = watching.type === "movie" ? Film : Tv;

  // Fetched lazily on first hover, not up front for every friend in the
  // rail — the compact pill already has everything it needs (name, title)
  // without a request; the richer poster/genres/rating/description only
  // matter once someone's actually looking. getMoviePreview/getSeriesPreview
  // cache by id, so hovering the same item again never re-fetches.
  function handleEnter() {
    setIsHovered(true);
    if (preview.loaded) return;
    const fetchPreview = watching.type === "movie" ? getMoviePreview(watching.tmdbId) : getSeriesPreview(watching.tmdbId);
    fetchPreview.then((data) => setPreview({ data, loaded: true }));
  }

  const genres = (preview.data?.genres ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 3);
  const rating = preview.data?.tmdbRating ? Number(preview.data.tmdbRating) : null;
  const year = preview.data?.releaseDate?.split("-")[0];
  const backdrop = tmdbImage(preview.data?.backgroundImg_URL ?? preview.data?.posterImgURL, "w780");

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={() => setIsHovered(false)}>
      <Link
        href={href}
        className="flex items-center gap-2.5 rounded-full border border-foreground/10 bg-surface/90 py-1.5 pr-4 pl-1.5 shadow-[0_8px_25px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-colors hover:border-emerald-400/30"
      >
        <span className="relative shrink-0">
          <Avatar src={friend.profileImageURL} name={friend.displayName} size={32} />
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-surface" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground/90">{friend.displayName || "?"}</span>
          <span className="flex items-center gap-1 truncate text-[11px] text-foreground/50">
            <TypeIcon size={10} className="shrink-0" />
            {watching.title}
          </span>
        </span>
      </Link>

      {isHovered && (
        <Link
          href={href}
          className="animate-card-open-right absolute top-0 left-full ml-3 block w-72 overflow-hidden rounded-2xl border border-foreground/10 bg-surface shadow-[0_25px_55px_-15px_rgba(0,0,0,0.75)]"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {backdrop ? (
              <FadeInImage src={backdrop} alt="" sizes="288px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-foreground/10 text-foreground/30">
                <TypeIcon size={26} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />

            <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
              <Avatar src={friend.profileImageURL} name={friend.displayName} size={20} className="ring-2 ring-surface" />
              <span className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {friend.displayName || "?"} · {t("friends.watching").toLowerCase()}
              </span>
            </div>
          </div>

          <div className="px-3.5 pt-2.5 pb-3.5">
            <h3 className="line-clamp-1 text-sm font-bold text-foreground">{watching.title}</h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-foreground/55">
              {rating !== null && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Star size={11} className="fill-amber-400" />
                  {rating.toFixed(1)}
                </span>
              )}
              {year && <span>{year}</span>}
              {watching.season && watching.episode && (
                <span>
                  S{watching.season} E{watching.episode}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {!preview.loaded ? (
                <>
                  <span className="h-5 w-14 animate-pulse rounded-full bg-foreground/10" />
                  <span className="h-5 w-16 animate-pulse rounded-full bg-foreground/10" />
                </>
              ) : (
                genres.map((genre) => (
                  <span key={genre} className="rounded-full border border-foreground/10 bg-foreground/5 px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                    {genre}
                  </span>
                ))
              )}
            </div>

            {preview.loaded && preview.data?.description && (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-foreground/60">{preview.data.description}</p>
            )}

            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900">
              <Play size={12} className="fill-current" />
              {t("friends.watchToo")}
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
