"use client";

import { forwardRef, useEffect, useState } from "react";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { Spinner } from "@/components/ui/loader";
import { ModernSelect } from "@/components/ui/modern-select";
import { useTranslation } from "@/lib/i18n/locale-context";
import { AdblockPrompt } from "@/components/movies/details/adblock-prompt";

// ISO 639-1 code both vidsrc-family mirrors and VidFast read to preselect a subtitle
// track, so viewers never have to open the player's own subtitle menu for this.
const DEFAULT_SUBTITLE_LANG = "bg";

// CineSrc's matcher (found in its client bundle) lowercases this and checks it against
// each fetched subtitle's display/language name, not an ISO code, so a language name is
// what it expects here rather than "bg".
const DEFAULT_SUBTITLE_LANG_NAME = "Bulgarian";

/**
 * The backend returns vidsrc.icu embed URLs, but the live app points the
 * iframe at a mirror domain instead — currently vidsrc2.ru. `ds_lang` (ISO639
 * code) is the vidsrc-embed-family's documented param for preselecting the
 * default subtitle language; `sub` is kept alongside for older vidsrc.icu/to
 * style mirrors that read that name instead.
 */
function toPlayableUrl(videoUrl: string) {
  return `${videoUrl.replace("vidsrc.icu", "vidsrc2.ru")}?sub=${DEFAULT_SUBTITLE_LANG}&ds_lang=${DEFAULT_SUBTITLE_LANG}`;
}

type VidsrcRef = { kind: "movie"; tmdbId: string } | { kind: "tv"; tmdbId: string; season: string; episode: string };

/**
 * Backend videoURLs are always vidsrc.icu embeds — ".../embed/movie/{tmdbId}" or
 * ".../embed/tv/{tmdbId}/{season}/{episode}" (see lib/tmdb.ts for the same trailing-id
 * trick). Parsed out here so the same TMDB title/episode can be requested from other
 * TMDB-id-based sources (vidfast.vc, cinesrc.st) as alternate players.
 */
function parseVidsrcUrl(videoUrl: string): VidsrcRef | null {
  const tv = videoUrl.match(/\/embed\/tv\/(\d+)\/(\d+)\/(\d+)/);
  if (tv) return { kind: "tv", tmdbId: tv[1], season: tv[2], episode: tv[3] };

  const movie = videoUrl.match(/\/embed\/movie\/(\d+)/);
  if (movie) return { kind: "movie", tmdbId: movie[1] };

  return null;
}

function toVidfastUrl(ref: VidsrcRef) {
  const path = ref.kind === "movie" ? `movie/${ref.tmdbId}` : `tv/${ref.tmdbId}/${ref.season}/${ref.episode}`;
  return `https://vidfast.vc/${path}?sub=${DEFAULT_SUBTITLE_LANG}`;
}

function toCinesrcUrl(ref: VidsrcRef) {
  const path =
    ref.kind === "movie" ? `movie/${ref.tmdbId}` : `tv/${ref.tmdbId}?s=${ref.season}&e=${ref.episode}`;
  const separator = ref.kind === "movie" ? "?" : "&";
  return `https://cinesrc.st/embed/${path}${separator}subtitlelang=${DEFAULT_SUBTITLE_LANG_NAME}&Position=10`;
}

export const PlayerSection = forwardRef<HTMLDivElement, { videoUrl: string }>(function PlayerSection({ videoUrl }, forwardedRef) {
  const { t } = useTranslation();
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [activePlayer, setActivePlayer] = useState<1 | 2 | 3>(1);

  const vidsrcRef = videoUrl ? parseVidsrcUrl(videoUrl) : null;
  const player2Url = vidsrcRef ? toVidfastUrl(vidsrcRef) : null;
  const player3Url = vidsrcRef ? toCinesrcUrl(vidsrcRef) : null;
  const player1Url = videoUrl ? toPlayableUrl(videoUrl) : "";
  const activeSrc =
    (activePlayer === 2 && player2Url) ||
    (activePlayer === 3 && player3Url) ||
    player1Url;

  useEffect(() => {
    if (activeSrc) setIsFrameLoading(true);
  }, [activeSrc]);

  // Rendering is intentionally unconditional (no early `return null` for an
  // empty videoUrl) — this section used to unmount/remount every time a
  // series went from "no video selected" to "episode picked", which reset
  // the scroll-reveal animation's IntersectionObserver and could leave the
  // freshly-mounted player stuck at opacity-0 right as the user scrolled to
  // it. Keeping the section mounted means only the iframe's src changes.
  return (
    <div ref={forwardedRef}>
      <section
        ref={ref}
        className={`mx-auto flex max-w-[80rem] flex-col items-center px-4 py-16 transition-all duration-700 sm:px-6 sm:py-20 ${
          inView ? "translate-y-0 opacity-100" : "translate-y-14 opacity-0"
        }`}
      >
        {videoUrl && vidsrcRef && (
          <div className="mb-3 flex w-full max-w-[80rem] justify-end">
            <ModernSelect
              value={String(activePlayer)}
              onChange={(next) => setActivePlayer(Number(next) as 1 | 2 | 3)}
              options={([1, 2, 3] as const).map((player) => ({
                value: String(player),
                label: `${t("player.player")} ${player}`,
              }))}
            />
          </div>
        )}
        <div className="relative aspect-video w-full max-w-[80rem] overflow-hidden rounded-2xl bg-black shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)]">
          {videoUrl ? (
            <>
              {isFrameLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                  <Spinner size={44} />
                </div>
              )}
              <iframe
                key={activeSrc}
                className="h-full w-full border-0"
                src={activeSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                scrolling="no"
                onLoad={() => setIsFrameLoading(false)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">{t("player.pickEpisode")}</div>
          )}
        </div>

        {videoUrl && <AdblockPrompt />}
      </section>
    </div>
  );
});
