"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Play, Tv, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { subscribeWatchingEvent } from "@/lib/watching-events";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { WatchingTarget } from "@/lib/watching";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const AUTO_DISMISS_MS = 10_000;

type ToastItem = {
  id: string;
  actorName: string | null;
  actorImageURL: string | null;
  watching: WatchingTarget;
  href: string;
  preview: Movie | Series | null;
  previewLoaded: boolean;
};

function hrefFor(watching: WatchingTarget) {
  return watching.type === "movie"
    ? `/movies/${getMovieSlug({ title: watching.title, tmdbId: watching.tmdbId })}`
    : `/series/${watching.tmdbId}`;
}

/**
 * Announces a friend starting (or switching) something to watch, bottom-right,
 * auto-dismissing after AUTO_DISMISS_MS — mounted once from SiteHeader, same
 * as MobileTabBar. Reacts to lib/watching-events.ts, which is already
 * deduped server-side (see lumo-user-svc's watching.Service.Set) — a plain
 * heartbeat repeating the same title never re-fires this, only a genuine
 * start or title/episode change does.
 *
 * The actor's name/avatar travel with the push itself (see
 * lumo-user-svc's watchingPush) rather than being cross-referenced against a
 * separately-fetched friends list — that avoided a real race (a push
 * arriving before this component's own friends fetch resolved silently
 * dropped the toast). The richer poster/genres/description come from the
 * same preview endpoint the hover-preview card already uses.
 */
export function WatchingToastManager() {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeWatchingEvent(({ actorDisplayName, actorProfileImageURL, watching }) => {
      if (!watching) return;

      const id = `${watching.tmdbId}-${Date.now()}`;
      setToasts((prev) => [
        ...prev,
        {
          id,
          actorName: actorDisplayName,
          actorImageURL: actorProfileImageURL,
          watching,
          href: hrefFor(watching),
          preview: null,
          previewLoaded: false,
        },
      ]);

      const fetchPreview = watching.type === "movie" ? getMoviePreview(watching.tmdbId) : getSeriesPreview(watching.tmdbId);
      fetchPreview.then((preview) => {
        setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, preview, previewLoaded: true } : toast)));
      });

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-50 flex flex-col gap-3 md:bottom-4">
      {toasts.map((toast) => {
        const TypeIcon = toast.watching.type === "movie" ? Film : Tv;
        const backdrop = tmdbImage(toast.preview?.backgroundImg_URL ?? toast.preview?.posterImgURL, "w780");
        const genres = (toast.preview?.genres ?? "")
          .split(",")
          .map((genre) => genre.trim())
          .filter(Boolean)
          .slice(0, 3);

        return (
          <Link
            key={toast.id}
            href={toast.href}
            onClick={() => dismiss(toast.id)}
            className="animate-toast-in pointer-events-auto group block w-80 overflow-hidden rounded-2xl border border-foreground/10 bg-surface shadow-[0_25px_55px_-15px_rgba(0,0,0,0.75)] backdrop-blur-xl"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {backdrop ? (
                <FadeInImage src={backdrop} alt="" sizes="320px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-foreground/10 text-foreground/30">
                  <TypeIcon size={28} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dismiss(toast.id);
                }}
                aria-label={t("friends.dismiss")}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white"
              >
                <X size={13} />
              </button>

              <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                <Avatar src={toast.actorImageURL} name={toast.actorName} size={22} className="ring-2 ring-surface" />
                <span className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {toast.actorName || "?"} · {t("friends.watching").toLowerCase()}
                </span>
              </div>
            </div>

            <div className="px-3.5 pt-2.5 pb-3.5">
              <h3 className="line-clamp-1 text-sm font-bold text-foreground">{toast.watching.title}</h3>

              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-foreground/55">
                <TypeIcon size={11} />
                {toast.watching.type === "movie" ? t("watchlist.movie") : t("watchlist.series")}
                {toast.watching.season && toast.watching.episode && (
                  <>
                    <span className="text-foreground/25">•</span>S{toast.watching.season} E{toast.watching.episode}
                  </>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {!toast.previewLoaded ? (
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

              {toast.previewLoaded && toast.preview?.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-foreground/60">{toast.preview.description}</p>
              )}

              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 transition-transform duration-200 group-hover:scale-[1.02]">
                <Play size={12} className="fill-current" />
                {t("friends.watchToo")}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
