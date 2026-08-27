"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Film, Heart, ListVideo, Lock, Tv, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { getRatingColor } from "@/components/ui/rating-ring";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { getLikesForUser, type LikedItem } from "@/lib/likes";
import { getPlaylistsForUser, type Playlist } from "@/lib/playlists";
import { useFriends } from "@/lib/use-friends";
import { useTranslation } from "@/lib/i18n/locale-context";

// Same pattern as actor-details-view.tsx — only ever needed once someone
// clicks the avatar, so it has no business being in this modal's initial bundle.
const BigImageLightbox = dynamic(() => import("@/components/ui/big-image-lightbox").then((mod) => mod.BigImageLightbox), { ssr: false });

function hrefFor(item: LikedItem) {
  return item.type === "TV-SHOW"
    ? `/series/${item.tmdbId}`
    : `/movies/${getMovieSlug({ title: item.title ?? "", tmdbId: item.tmdbId, movieId: item.videoId })}`;
}

// Compact "user profile" — their liked movies/series and public playlists
// (per the user, 2026-08). Both are friendship-gated (revised, 2026-08 —
// originally likes were public to any signed-in caller, the user reversed
// that call): the backend already enforces this (see lumo-user-svc's
// likes.Service.GetLikesForUser / playlists.Service.ListForUser — a
// non-friend just gets an empty array back), but the UI needs its own
// friend/not-friend signal to show the right thing instead of a
// confusingly-empty "no likes yet" for someone you simply aren't friends
// with. isFriend is derived client-side from the caller's own friends list
// (useFriends) rather than a dedicated endpoint — it's data we already have.
export function UserProfileModal({
  clerkId,
  displayName,
  profileImageURL,
  onClose,
  onNavigate,
}: {
  clerkId: string;
  displayName: string | null;
  profileImageURL: string | null;
  onClose: () => void;
  // Fires (in addition to onClose) when the user clicks through to a
  // movie/series — lets an ancestor modal (FriendsModal, the notifications
  // dropdown) close itself too, instead of being left open on top of the
  // page we just navigated to. Plain dismissal (X, backdrop, Escape) should
  // only ever close this modal, so it's kept separate from onClose.
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { friends, isLoading: isFriendsLoading } = useFriends();
  const [items, setItems] = useState<LikedItem[] | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  // Liked titles and playlists are both capped at 30 (see lumo-user-svc's
  // likes/playlists packages), but showing all 30 at once here is a lot for
  // a compact modal — reveal 6 at a time instead, for both sections.
  const [visibleLikesCount, setVisibleLikesCount] = useState(6);
  const [visiblePlaylistsCount, setVisiblePlaylistsCount] = useState(6);

  const isSelf = user?.id === clerkId;
  const isFriend = isSelf || friends.some((f) => f.clerkId === clerkId);
  const canView = !isFriendsLoading && isFriend;

  useEffect(() => {
    if (isFriendsLoading) return;
    if (!isFriend) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- not-a-friend is a terminal state, not something to keep re-deriving
      setItems([]);
      setPlaylists([]);
      return;
    }

    let cancelled = false;
    setItems(null);
    setPlaylists(null);
    Promise.all([getLikesForUser(clerkId), getPlaylistsForUser(clerkId)]).then(([likedItems, userPlaylists]) => {
      if (cancelled) return;
      setItems(likedItems);
      setPlaylists(userPlaylists);
    });
    return () => {
      cancelled = true;
    };
  }, [clerkId, isFriend, isFriendsLoading]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleNavigate = () => {
    onClose();
    onNavigate?.();
  };

  return (
    <>
      {showLightbox && profileImageURL && (
        <BigImageLightbox images={[{ url: profileImageURL, type: "user" }]} initialIndex={0} onClose={() => setShowLightbox(false)} />
      )}
      {createPortal(
        // z-[70] clears FriendsModal's z-[60] — opening a profile from inside
        // the friends modal should stack on top of it, not behind.
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 pb-[10vh]" onClick={onClose}>
          <div className="animate-modal-backdrop-in absolute inset-0 bg-black/75 backdrop-blur-md" />
          <div
            onClick={(event) => event.stopPropagation()}
            className="animate-modal-card-in relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-[0_30px_90px_-15px_rgba(0,0,0,0.7)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent" />

            <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-7 py-7">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  onClick={() => profileImageURL && setShowLightbox(true)}
                  disabled={!profileImageURL}
                  aria-label={displayName || undefined}
                  className="rounded-full bg-gradient-to-br from-white/25 to-white/5 p-[2px] transition-transform duration-200 enabled:hover:scale-105 disabled:cursor-default"
                >
                  <Avatar src={profileImageURL} name={displayName} size={64} className="ring-2 ring-surface" />
                </button>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-bold tracking-tight text-foreground">{displayName || "?"}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-foreground/50">
                    <span className="flex items-center gap-1.5">
                      <Heart size={13} className="fill-current text-white/70" />
                      {canView && items !== null ? t("profile.likesCount", { count: items.length }) : t("profile.likes")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ListVideo size={13} className="text-white/70" />
                      {canView && playlists !== null ? t("profile.playlistsCount", { count: playlists.length }) : t("profile.sharedPlaylists")}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("nav.closeMenu")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground/60 transition-all duration-200 hover:scale-105 hover:bg-foreground/10 hover:text-foreground"
              >
                <X size={19} />
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {isFriendsLoading ? (
                <Loader className="min-h-[16rem] py-8" />
              ) : !isFriend ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
                    <Lock size={22} />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{t("profile.friendsOnlyTitle")}</h3>
                  <p className="max-w-sm text-sm text-foreground/50">{t("profile.friendsOnlyDesc", { name: displayName || "?" })}</p>
                </div>
              ) : (
                <>
                  <h3 className="mb-4 text-xs font-semibold tracking-wide text-foreground/50 uppercase">{t("profile.likes")}</h3>
                  {items === null ? (
                    <Loader className="min-h-[10rem] py-8" />
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
                        <Heart size={20} />
                      </span>
                      <p className="text-sm text-foreground/50">{t("profile.likesEmpty")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
                        {items.slice(0, visibleLikesCount).map((item) => (
                          <LikedTile key={item.id} item={item} onNavigate={handleNavigate} />
                        ))}
                      </div>
                      {items.length > visibleLikesCount && (
                        <button
                          type="button"
                          onClick={() => setVisibleLikesCount((prev) => prev + 6)}
                          className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-foreground/60 transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
                        >
                          {t("playlists.loadMore")}
                        </button>
                      )}
                    </>
                  )}

                  <h3 className="mt-8 mb-4 text-xs font-semibold tracking-wide text-foreground/50 uppercase">{t("profile.sharedPlaylists")}</h3>
                  {playlists === null ? (
                    <Loader className="min-h-[8rem] py-6" />
                  ) : playlists.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
                        <ListVideo size={20} />
                      </span>
                      <p className="text-sm text-foreground/50">{t("playlists.noneVisible")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3">
                        {playlists.slice(0, visiblePlaylistsCount).map((playlist) => (
                          <PlaylistCard key={playlist.id} playlist={playlist} canManage={false} onNavigate={handleNavigate} itemsPageSize={6} />
                        ))}
                      </div>
                      {playlists.length > visiblePlaylistsCount && (
                        <button
                          type="button"
                          onClick={() => setVisiblePlaylistsCount((prev) => prev + 6)}
                          className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-foreground/60 transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
                        >
                          {t("playlists.loadMore")}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function LikedTile({ item, onNavigate }: { item: LikedItem; onNavigate: () => void }) {
  const poster = tmdbImage(item.posterImgURL, "w500");
  const rating = item.tmdbRating ? Math.max(0, Math.min(10, Number(item.tmdbRating) || 0)) : null;
  const TypeIcon = item.type === "TV-SHOW" ? Tv : Film;

  return (
    <Link href={hrefFor(item)} onClick={onNavigate} className="group block">
      <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-foreground/5 ring-1 ring-white/10 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:ring-white/40 group-hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.7)]">
        {poster && (
          <FadeInImage
            src={poster}
            alt={item.title ?? ""}
            sizes="150px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/5 to-transparent" />

        {rating !== null && rating > 0 && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full border border-white/15 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-md">
            <span aria-hidden style={{ color: getRatingColor(rating) }}>
              ★
            </span>
            <span className="text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="line-clamp-2 text-[11px] leading-tight font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{item.title}</p>
          <TypeIcon size={10} className="mt-1 text-white/60" />
        </div>
      </div>
    </Link>
  );
}
