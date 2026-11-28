"use client";

import { useEffect, useState } from "react";
import { useIsAdmin } from "@/lib/use-admin";
import { describeSubtitleSource, type SubtitleSourceInfo } from "@/lib/subtitle-source";

/**
 * Admin only, above the players: where this movie's / episode's Bulgarian
 * subtitle came from (machine translation, which provider, CAM…). Renders
 * nothing for anyone else — the server route checks the caller.
 */
export function AdminSubtitleNote({ kind, tmdbId, season, episode }: { kind: "movie" | "tv"; tmdbId: string; season?: string; episode?: string }) {
  const isAdmin = useIsAdmin();
  const [state, setState] = useState<{ key: string; info: SubtitleSourceInfo | null } | null>(null);
  const key = `${kind}:${tmdbId}:${season ?? ""}:${episode ?? ""}`;

  useEffect(() => {
    if (!isAdmin || !tmdbId) return;
    let cancelled = false;
    const params = new URLSearchParams({ type: kind === "tv" ? "series" : "movie", tmdbId });
    if (season) params.set("season", season);
    if (episode) params.set("episode", episode);
    fetch(`/api/admin/subtitle-source?${params}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { source: null }))
      .then((data: { source: string | null }) => !cancelled && setState({ key, info: describeSubtitleSource(data.source) }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, kind, tmdbId, season, episode, key]);

  if (!isAdmin) return null;
  const info = state?.key === key ? state.info : undefined;

  const tone =
    info === undefined
      ? "border-white/15 bg-white/[0.06] text-white/60"
      : info === null
        ? "border-white/15 bg-white/[0.06] text-white/70"
        : info.kind === "machine"
          ? "border-violet-300/40 bg-violet-600/25 text-violet-100"
          : info.kind === "cam"
            ? "border-orange-300/40 bg-orange-600/25 text-orange-100"
            : "border-emerald-300/40 bg-emerald-600/25 text-emerald-100";

  return (
    <div className={`mb-3 flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-2 text-xs sm:text-sm ${tone}`}>
      <span className="font-bold">🛠 Субтитри{kind === "tv" && season && episode ? ` (С${season} Е${episode})` : ""}:</span>
      <span className="font-semibold">{info === undefined ? "проверявам…" : info === null ? "няма БГ субтитри в базата" : info.label}</span>
      {info?.raw && (
        <span className="min-w-0 truncate font-mono text-[0.6875rem] opacity-60" title={info.raw}>
          {info.raw}
        </span>
      )}
    </div>
  );
}
