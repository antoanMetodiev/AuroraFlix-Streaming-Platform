"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Film, Heart, Tv, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { getRatingColor } from "@/components/ui/rating-ring";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { getLikesForUser, type LikedItem } from "@/lib/likes";
import { useTranslation } from "@/lib/i18n/locale-context";

function hrefFor(item: LikedItem) {
  return item.type === "TV-SHOW" ? `/series/${item.tmdbId}` : `/movies/${getMovieSlug({ title: item.title ?? "", movieId: item.videoId })}`;
}

// Compact "user profile" — just their liked movies/series for now (per the
// user, 2026-08). Deliberately visible for anyone clickable from (friends,
// search results, notifications), not gated behind being friends — the
// backend endpoint (getLikesForUser) is public among signed-in users too.
export function UserProfileModal({
  clerkId,
  displayName,
  profileImageURL,
  onClose,
}: {
  clerkId: string;
  displayName: string | null;
  profileImageURL: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<LikedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null);
    getLikesForUser(clerkId).then((result) => {
      if (!cancelled) setItems(result);
    });
    return () => {
      cancelled = true;
    };
  }, [clerkId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    // z-[70] clears FriendsModal's z-[60] — opening a profile from inside
    // the friends modal should stack on top of it, not behind.
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 pb-[10vh]" onClick={onClose}>
      <div className="animate-modal-backdrop-in absolute inset-0 bg-black/75 backdrop-blur-md" />
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-modal-card-in relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-[0_30px_90px_-15px_rgba(0,0,0,0.7)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent" />

        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-7 py-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="rounded-full bg-gradient-to-br from-white/25 to-white/5 p-[2px]">
              <Avatar src={profileImageURL} name={displayName} size={64} className="ring-2 ring-surface" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold tracking-tight text-foreground">{displayName || "?"}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground/50">
                <Heart size={13} className="fill-current text-white/70" />
                {items === null ? t("profile.likes") : t("profile.likesCount", { count: items.length })}
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
          {items === null ? (
            <Loader className="min-h-[16rem] py-8" />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
                <Heart size={24} />
              </span>
              <p className="text-sm text-foreground/50">{t("profile.likesEmpty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
              {items.map((item) => (
                <LikedTile key={item.id} item={item} onNavigate={onClose} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
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
