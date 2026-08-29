"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const { friends: realFriends, watching: realWatching } = useFriends();
  // TEMP-TEST-FAKE-DATA
  const friends: Friend[] =
    realFriends.length > 0
      ? realFriends
      : [{ clerkId: "fake1", displayName: "Ivan Petrov", profileImageURL: null, friendsSince: null }];
  const watching: Record<string, WatchingTarget> =
    Object.keys(realWatching).length > 0
      ? realWatching
      : { fake1: { tmdbId: "1396", type: "series", title: "Breaking Bad: An Extremely Long Title For Testing Truncation", season: 3, episode: 5 } };
  // Capped rather than made scrollable — a scroll container needs
  // overflow-y, and per the CSS overflow spec setting only one axis forces
  // the OTHER to compute as "auto" too (never "visible") whenever it isn't
  // already non-visible: https://www.w3.org/TR/CSS22/visufx.html#overflow
  // ("if one is visible and other isn't, visible behaves as auto"). That
  // silently clipped the hover flyout below, which deliberately overflows
  // this rail's own bounds — a capped, unscrolled list sidesteps the whole
  // issue instead of fighting it with yet another portal.
  const watchingFriends = friends.filter((friend) => watching[friend.clerkId]).slice(0, MAX_SIDEBAR_FRIENDS);

  if (watchingFriends.length === 0) return null;

  return (
    <div className="fixed top-[42%] right-4 z-30 hidden -translate-y-1/2 flex-col gap-2.5 xl:flex">
      {watchingFriends.map((friend) => (
        <WatchingSidebarItem key={friend.clerkId} friend={friend} watching={watching[friend.clerkId]} />
      ))}
    </div>
  );
}

function WatchingSidebarItem({ friend, watching }: { friend: Friend; watching: WatchingTarget }) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLAnchorElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  // The flyout is portaled to <body> (see below), so it doesn't naturally
  // sit next to whichever row triggered it — measured fresh on every hover
  // instead, so it lines up with THAT friend's own pill instead of always
  // popping up at one fixed spot on screen regardless of which row (1st,
  // 2nd, ...) is actually hovered.
  const [anchorTop, setAnchorTop] = useState(0);

  // The flyout is roughly 360px tall (aspect-video image + text content) —
  // centering it exactly on a row near the top or bottom of the rail would
  // push it off-screen, so its midpoint is clamped to stay clear of both
  // viewport edges by (approximately) its own half-height.
  const FLYOUT_HALF_HEIGHT = 180;

  function handleEnter() {
    const rect = rowRef.current?.getBoundingClientRect();
    if (rect) {
      const center = rect.top + rect.height / 2;
      const clamped = Math.min(Math.max(center, FLYOUT_HALF_HEIGHT + 16), window.innerHeight - FLYOUT_HALF_HEIGHT - 16);
      setAnchorTop(clamped);
    }
    setIsHovered(true);
  }
  // Keyed like friends-panel.tsx's FriendWatchingCard, not a plain "have we
  // ever fetched" boolean — a bare loaded flag never re-fetches once true,
  // so switching to a different title while already hovered once (or
  // re-hovering after a switch) kept showing the previous title's
  // poster/genres/rating forever instead of catching up.
  const key = `${watching.type}:${watching.tmdbId}`;
  const [resolved, setResolved] = useState<{ key: string; data: Movie | Series | null } | null>(null);

  const href = hrefFor(watching);
  const TypeIcon = watching.type === "movie" ? Film : Tv;

  // Fetched lazily on hover, not up front for every friend in the rail —
  // the compact pill already has everything it needs (name, title) without
  // a request; the richer poster/genres/rating/description only matter once
  // someone's actually looking. Re-runs if `key` changes while still
  // hovered too, so a friend switching titles mid-hover catches up live
  // instead of only on the next hover-enter.
  useEffect(() => {
    if (!isHovered || resolved?.key === key) return;
    let cancelled = false;
    const fetchPreview = watching.type === "movie" ? getMoviePreview(watching.tmdbId) : getSeriesPreview(watching.tmdbId);
    fetchPreview.then((data) => {
      if (!cancelled) setResolved({ key, data });
    });
    return () => {
      cancelled = true;
    };
  }, [isHovered, key, watching.type, watching.tmdbId, resolved?.key]);

  const loaded = resolved?.key === key;
  const preview = loaded ? resolved.data : null;
  const genres = (preview?.genres ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 3);
  const rating = preview?.tmdbRating ? Number(preview.tmdbRating) : null;
  const year = preview?.releaseDate?.split("-")[0];
  const backdrop = tmdbImage(preview?.backgroundImg_URL ?? preview?.posterImgURL, "w780");

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={() => setIsHovered(false)}>
      <Link
        ref={rowRef}
        href={href}
        className="flex w-52 items-center gap-2.5 rounded-full border border-foreground/10 bg-surface/90 py-1.5 pr-4 pl-1.5 shadow-[0_8px_25px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-colors hover:border-emerald-400/30"
      >
        <span className="relative shrink-0">
          <Avatar src={friend.profileImageURL} name={friend.displayName} size={32} />
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-surface" />
        </span>
        {/* min-w-0 alone doesn't give `truncate` anything to truncate
            against inside an otherwise unconstrained flex-col rail — a long
            title just grew the whole pill instead of ellipsizing. The fixed
            w-52 above is what actually bounds it. */}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-foreground/90">{friend.displayName || "?"}</span>
          <span className="flex items-center gap-1 truncate text-[11px] text-foreground/50">
            <TypeIcon size={10} className="shrink-0" />
            {watching.title}
          </span>
        </span>
      </Link>

      {/* Portaled to <body> — this item's own ancestor (the rail) is
          positioned via top-[42%] -translate-y-1/2, and that translate is a
          transform, which makes the rail the containing block for any
          fixed/absolute descendant instead of the viewport. A plain `fixed`
          here would resolve against the rail's own narrow box instead of
          the screen's actual edges.
          `top` is measured off the hovered row itself (see handleEnter), not
          a fixed value — otherwise every row's flyout popped up at the same
          spot on screen instead of next to whichever friend is actually
          hovered. The rail sits flush against the true right edge (right-4),
          so this card opens further in (right-80) — to its LEFT — instead
          of stacking on top of it. */}
      {isHovered &&
        createPortal(
          <Link
            href={href}
            style={{ top: anchorTop }}
            className="animate-modal-card-in fixed right-80 z-30 block w-72 -translate-y-1/2 overflow-hidden rounded-2xl border border-foreground/10 bg-surface shadow-[0_25px_55px_-15px_rgba(0,0,0,0.75)]"
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
                {!loaded ? (
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

              {loaded && preview?.description && (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-foreground/60">{preview.description}</p>
              )}

              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900">
                <Play size={12} className="fill-current" />
                {t("friends.watchToo")}
              </div>
            </div>
          </Link>,
          document.body
        )}
    </div>
  );
}
