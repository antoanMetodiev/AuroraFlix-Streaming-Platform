"use client";

import { ListVideo, Play } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { slowScrollTo } from "@/lib/smooth-scroll";

/**
 * The details page's main call to action: sits next to the watchlist/like
 * buttons and glides down to the player (#watch, see NavSection) — for series
 * that's the player + episode list.
 */
export function WatchNowButton({ type }: { type: "movie" | "series" }) {
  const { t } = useTranslation();
  const Icon = type === "series" ? ListVideo : Play;

  return (
    <a
      href="#watch"
      onClick={(event) => {
        const target = document.getElementById("watch");
        if (!target) return;
        event.preventDefault();
        slowScrollTo(target);
      }}
      className="group relative inline-flex h-11 items-center gap-2.5 overflow-hidden rounded-full bg-white pr-5 pl-2 text-sm font-semibold text-neutral-900 shadow-[0_6px_28px_-6px_rgba(255,255,255,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_36px_-6px_rgba(255,255,255,0.8)] sm:text-base"
    >
      {/* Light sweep across the pill on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100"
      />
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform duration-300 group-hover:scale-110">
        <Icon size={15} className={type === "series" ? "" : "ml-0.5 fill-current"} />
      </span>
      <span className="relative">{t(type === "series" ? "episodes.jump" : "player.watchNow")}</span>
    </a>
  );
}
