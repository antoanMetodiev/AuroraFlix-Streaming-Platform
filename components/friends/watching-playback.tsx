"use client";

import { Pause } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { WatchingTarget } from "@/lib/watching";

/**
 * Where a friend is in what they're watching: "S2 E5 · Minute 47 of 132 ·
 * Paused" and a thin bar, as far as their player reports it (see
 * useWatchingPresence). Renders nothing when nothing of it is known.
 */
export function WatchingPlayback({ watching }: { watching: WatchingTarget }) {
  const { t } = useTranslation();
  const { season, episode, position, duration, paused } = watching;

  const parts: string[] = [];
  if (season && episode) parts.push(t("friends.episodeShort", { season, episode }));
  if (position !== undefined) {
    const minute = t("friends.atMinute", { minute: Math.max(1, Math.floor(position / 60)) });
    parts.push(duration ? `${minute} ${t("friends.ofMinutes", { total: Math.round(duration / 60) })}` : minute);
  }
  if (parts.length === 0 && !paused) return null;

  const progress = position !== undefined && duration ? Math.min(1, position / duration) : null;

  return (
    <div className="mt-1">
      <p className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-foreground/60">
        {parts.join(" · ")}
        {paused && (
          <span className="flex items-center gap-0.5 font-medium text-amber-400">
            <Pause size={9} className="fill-amber-400" />
            {t("friends.paused")}
          </span>
        )}
      </p>
      {progress !== null && (
        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className={`h-full rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}
