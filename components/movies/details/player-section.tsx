"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { Spinner } from "@/components/ui/loader";
import { ModernSelect } from "@/components/ui/modern-select";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { useTranslation } from "@/lib/i18n/locale-context";
import { AdblockPrompt } from "@/components/movies/details/adblock-prompt";
import { SubtitleOverlay } from "@/components/movies/details/subtitle-overlay";
import { useWatchingPresence } from "@/lib/use-watching-presence";
import type { WatchingTarget } from "@/lib/watching";

type VidsrcRef =
  | {
      kind: "movie";
      tmdbId: string;
    }
  | {
      kind: "tv";
      tmdbId: string;
      season: string;
      episode: string;
    };

type PlayerSectionProps = {
  videoUrl: string;
  title?: string;
  poster?: string | null;
};

/**
 * Parse the original vidsrc URL so we can construct
 * the other two player URLs from the same TMDB id.
 */
function parseVidsrcUrl(videoUrl: string): VidsrcRef | null {
  const tv = videoUrl.match(
    /\/embed\/tv\/(\d+)\/(\d+)\/(\d+)/
  );

  if (tv) {
    return {
      kind: "tv",
      tmdbId: tv[1],
      season: tv[2],
      episode: tv[3],
    };
  }

  const movie = videoUrl.match(
    /\/embed\/movie\/(\d+)/
  );

  if (movie) {
    return {
      kind: "movie",
      tmdbId: movie[1],
    };
  }

  return null;
}

/**
 * Add query parameters safely to a URL.
 */
function appendParams(
  url: string,
  params: Record<string, string | undefined>
): string {
  try {
    const parsed = new URL(url);

    for (const [key, value] of Object.entries(params)) {
      if (value) {
        parsed.searchParams.set(key, value);
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Safari/iOS still only expose the prefixed Fullscreen API.
 */
type PrefixedFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type PrefixedFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

function getFullscreenElement(): Element | null {
  const doc = document as PrefixedFullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function requestFullscreen(el: HTMLElement) {
  const target = el as PrefixedFullscreenElement;
  return (target.requestFullscreen ?? target.webkitRequestFullscreen)?.call(target);
}

function exitFullscreen() {
  const doc = document as PrefixedFullscreenDocument;
  return (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
}

/**
 * Default language used by the player providers' own bundled subtitles.
 */
const DEFAULT_SUBTITLE_LANG = "bg";

/**
 * vidsrc.icu -> vidsrc2.ru
 *
 * <SubtitleOverlay> is CineSrc-exclusive now (see `hasOwnSubtitles` below),
 * so it never competes with this provider's own bundled subtitle — always
 * ask it to preselect its Bulgarian track instead of leaving the viewer
 * with no subtitles at all when they switch to this player.
 */
function toPlayableUrl(videoUrl: string): string {
  const playableUrl = videoUrl.replace(
    "vidsrc.icu",
    "vidsrc2.ru"
  );

  return appendParams(playableUrl, {
    autoplay: "1",
    sub: DEFAULT_SUBTITLE_LANG,
    ds_lang: DEFAULT_SUBTITLE_LANG,
  });
}

/**
 * VidFast
 *
 * Same reasoning as vidsrc2.ru above — <SubtitleOverlay> doesn't render on
 * this player, so its own bundled Bulgarian track is always requested.
 */
function toVidfastUrl(ref: VidsrcRef): string {
  const path =
    ref.kind === "movie"
      ? `movie/${ref.tmdbId}`
      : `tv/${ref.tmdbId}/${ref.season}/${ref.episode}`;

  return appendParams(
    `https://vidfast.vc/${path}`,
    {
      autoPlay: "true",
      sub: DEFAULT_SUBTITLE_LANG,
      lang: DEFAULT_SUBTITLE_LANG,
    }
  );
}

/**
 * CineSrc — the only player <SubtitleOverlay> renders on.
 *
 * Per the official docs (cinesrc.st/docs), there is no subtitle-related URL
 * parameter or postMessage command at all — `Position` and `subtitlelang`
 * (previously sent here) aren't real parameters and had no effect. CineSrc
 * shows its own default subtitle track (usually English) with no
 * documented way to turn it off or select a language, which is why it can
 * still appear alongside <SubtitleOverlay>'s — a genuine platform
 * limitation, not something a query param can fix.
 */
function toCinesrcUrl(ref: VidsrcRef): string {
  const path =
    ref.kind === "movie"
      ? `movie/${ref.tmdbId}`
      : `tv/${ref.tmdbId}`;

  return appendParams(`https://cinesrc.st/embed/${path}`, {
    autoplay: "true",
    ...(ref.kind === "tv"
      ? {
          s: ref.season,
          e: ref.episode,
        }
      : {}),
  });
}

export const PlayerSection = forwardRef<
  HTMLDivElement,
  PlayerSectionProps
>(function PlayerSection(
  {
    videoUrl,
    title,
    poster,
  },
  forwardedRef
) {
  const { t } = useTranslation();

  const {
    ref,
    inView,
  } = useInViewOnce<HTMLDivElement>(0.2);

  const [isFrameLoading, setIsFrameLoading] =
    useState(true);

  // Whether *we* have our own Bulgarian subtitles for this title — checked
  // client-side, in the background, by the effect below (see its doc
  // comment for why this can no longer be a prop resolved before this
  // component ever mounts). Starts as "no subtitles" and flips to the real
  // answer once/if the check resolves; never blocks anything above.
  const [subtitleUrl, setSubtitleUrl] =
    useState<string | undefined>(undefined);

  /**
   * <SubtitleOverlay> only ever renders on CineSrc (see below), so when we
   * have our own Bulgarian subtitles it's listed first/default — VidFast
   * and vidsrc2.ru stay available too, just as fallbacks the viewer can
   * switch to (with their own bundled subtitles instead of ours).
   */
  const hasOwnSubtitles = Boolean(subtitleUrl);

  const playerOrder = useMemo<
    readonly (1 | 2 | 3)[]
  >(
    () =>
      hasOwnSubtitles
        ? [3, 1, 2]
        : [1, 2, 3],
    [hasOwnSubtitles]
  );

  const [activePlayer, setActivePlayer] =
    useState<1 | 2 | 3>(() =>
      hasOwnSubtitles ? 3 : 1
    );

  const [hasStarted, setHasStarted] =
    useState(false);

  // Read inside the subtitle-check effect below without making it re-run
  // (and re-fetch) every time playback starts or the viewer switches
  // players — it only needs the *latest* values at the moment the check
  // resolves, not to react to their changes itself.
  const hasStartedRef = useRef(hasStarted);
  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);
  const userChangedPlayerRef = useRef(false);

  /**
   * "Big view" — a CSS `fixed inset-0` expansion of our wrapper (iframe +
   * subtitle overlay together), not the real browser Fullscreen API.
   *
   * Our own button just toggles this directly — no privileged API, no
   * gesture requirements, always works.
   *
   * The provider's own fullscreen button (inside the cross-origin iframe)
   * fullscreens just the iframe, hiding our overlay (a sibling) behind the
   * browser's fullscreen "top layer" — no CSS reaches that from outside it.
   * Re-requesting real fullscreen on our own wrapper right after doesn't
   * work either: a click *inside* the iframe grants activation to the
   * iframe's own browsing context, not ours, so our own
   * `requestFullscreen()` call gets silently rejected. `exitFullscreen()`
   * has no such restriction though — a page can always leave fullscreen —
   * so for THAT specific case (and only that case) we let their request
   * through, immediately exit it, and fall back to a CSS "big view" that
   * doesn't need permission from anything. Their player never gets a real
   * fullscreen signal of its own, so its own controls stay their normal
   * (non-fullscreen) size, and the browser's own chrome (tabs, address bar)
   * stays visible — a real trade-off, not a bug, and the reason our own
   * button (real fullscreen, hides all of that) stays the better option.
   */
  const [isRealFullscreen, setIsRealFullscreen] =
    useState(false);

  const [isBigView, setIsBigView] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleFullscreenChange() {
      const current = getFullscreenElement();

      if (current === containerRef.current) {
        setIsRealFullscreen(true);
        return;
      }

      setIsRealFullscreen(false);

      if (current && hasOwnSubtitles && activePlayer === 3) {
        exitFullscreen();
        setIsBigView(true);
      }
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );
    document.addEventListener(
      "webkitfullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
    };
  }, [hasOwnSubtitles, activePlayer]);

  /**
   * Escape closes the CSS big view, and the page can't scroll behind it —
   * real fullscreen already gets both of these from the browser for free.
   */
  useEffect(() => {
    if (!isBigView) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsBigView(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBigView]);

  function toggleFullscreen() {
    if (isBigView) {
      setIsBigView(false);
      return;
    }

    if (getFullscreenElement()) {
      exitFullscreen();
    } else if (containerRef.current) {
      requestFullscreen(
        containerRef.current
      )?.catch(() => {});
    }
  }

  const vidsrcRef = useMemo(
    () =>
      videoUrl
        ? parseVidsrcUrl(videoUrl)
        : null,
    [videoUrl]
  );

  /**
   * Checks, in the background, whether we have our own Bulgarian subtitles
   * for this movie. Deliberately NOT awaited by the server component that
   * renders this page (see app/movies/[slug]/page.tsx) — that used to call
   * the subtitles-taker service directly before returning any HTML at all,
   * so whenever that (Render free-tier) service was slow or fully down,
   * every single movie page waited the full 10s AbortSignal.timeout before
   * showing anything. This effect runs client-side, after the player has
   * already mounted and started playing on its default choice — a failure
   * or slow response here (caught below) just means no subtitle track for
   * this session, exactly like a genuine "not found" already behaves; it
   * can never block or break the player itself.
   *
   * If it resolves in time — before the viewer has clicked Play or touched
   * the player selector themselves — the CineSrc-first default is applied
   * retroactively via setActivePlayer(3), same preference the old
   * synchronous check used to set from the start. After either of those,
   * the subtitle track is still available in the player list, just no
   * longer auto-selected — switching mid-playback would be more jarring
   * than helpful.
   */
  useEffect(() => {
    if (!vidsrcRef || vidsrcRef.kind !== "movie") return;

    let cancelled = false;
    const url = `/api/subtitles/${encodeURIComponent(vidsrcRef.tmdbId)}`;

    fetch(url, { cache: "force-cache" })
      .then((res) => {
        if (cancelled || !res.ok) return;
        setSubtitleUrl(url);
        if (!hasStartedRef.current && !userChangedPlayerRef.current) {
          setActivePlayer(3);
        }
      })
      .catch(() => {
        // Subtitles service unreachable/slow/down — no subtitle track for
        // this session. Never surfaced to the viewer.
      });

    return () => {
      cancelled = true;
    };
  }, [vidsrcRef]);

  /**
   * Build all three player URLs.
   *
   * Our Bulgarian subtitles are rendered by <SubtitleOverlay> below, only on
   * top of player 3 (CineSrc) — see the comments on the URL builders above.
   */
  const player1Url = useMemo(
    () =>
      videoUrl
        ? toPlayableUrl(videoUrl)
        : "",
    [videoUrl]
  );

  const player2Url = useMemo(
    () =>
      vidsrcRef
        ? toVidfastUrl(vidsrcRef)
        : null,
    [vidsrcRef]
  );

  const player3Url = useMemo(
    () =>
      vidsrcRef
        ? toCinesrcUrl(vidsrcRef)
        : null,
    [vidsrcRef]
  );

  /**
   * Select active player.
   */
  const activeSrc =
    activePlayer === 2 && player2Url
      ? player2Url
      : activePlayer === 3 && player3Url
        ? player3Url
        : player1Url;

  /**
   * Show loader whenever iframe source changes.
   */
  useEffect(() => {
    if (activeSrc) {
      setIsFrameLoading(true);
    }
  }, [activeSrc]);

  /**
   * New movie / episode requires clicking our Play button again.
   */
  useEffect(() => {
    setHasStarted(false);
  }, [videoUrl]);

  /**
   * Watching presence.
   */
  const watchingTarget: WatchingTarget | null =
    vidsrcRef &&
    title &&
    hasStarted
      ? {
          tmdbId: vidsrcRef.tmdbId,

          type:
            vidsrcRef.kind === "movie"
              ? "movie"
              : "series",

          title,

          season:
            vidsrcRef.kind === "tv"
              ? Number(vidsrcRef.season)
              : undefined,

          episode:
            vidsrcRef.kind === "tv"
              ? Number(vidsrcRef.episode)
              : undefined,
        }
      : null;

  useWatchingPresence(
    watchingTarget
  );

  return (
    <div ref={forwardedRef}>
      <section
        ref={ref}
        className={`mx-auto flex max-w-[80rem] flex-col items-center px-4 py-16 transition-all duration-700 sm:px-6 sm:py-20 ${
          inView
            ? "translate-y-0 opacity-100"
            : "translate-y-14 opacity-0"
        }`}
      >
        {videoUrl && vidsrcRef && playerOrder.length > 1 && (
          <div className="mb-3 flex w-full max-w-[80rem] justify-end">
            <ModernSelect
              value={String(activePlayer)}
              onChange={(next) => {
                userChangedPlayerRef.current = true;
                setActivePlayer(
                  Number(next) as 1 | 2 | 3
                );
              }}
              options={
                playerOrder.map(
                  (provider, index) => ({
                    value: String(provider),
                    label: `${t(
                      "player.player"
                    )} ${index + 1}`,
                  })
                )
              }
            />
          </div>
        )}

        {(() => {
          const playerBody = (
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
                title={
                  title
                    ? `${title} player`
                    : "Video player"
                }
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                scrolling="no"
                onLoad={() =>
                  setIsFrameLoading(false)
                }
              />

              {subtitleUrl && activePlayer === 3 && (
                <SubtitleOverlay
                  subtitleUrl={subtitleUrl}
                  active={hasStarted}
                  activePlayer={activePlayer}
                  isFullscreen={isRealFullscreen || isBigView}
                  onToggleFullscreen={toggleFullscreen}
                />
              )}
            </>
          );

          if (
            isBigView &&
            typeof document !== "undefined"
          ) {
            /**
             * The fade-in-on-scroll animation above sets `translate-y-*` on
             * the ancestor <section> — any CSS transform on an ancestor
             * becomes the containing block for `position: fixed`
             * descendants, so a plain fixed box here would size itself to
             * that section instead of the viewport. Portalling straight to
             * <body> sidesteps that ancestor chain entirely.
             */
            return createPortal(
              <div
                ref={containerRef}
                className="animate-big-view-in fixed inset-0 z-[100] bg-black"
              >
                {playerBody}
              </div>,
              document.body
            );
          }

          return (
            <div
              ref={containerRef}
              className="relative aspect-video w-full max-w-[80rem] overflow-hidden rounded-2xl bg-black shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)]"
            >
              {videoUrl ? (
                hasStarted ? (
                  playerBody
                ) : (
              <button
                type="button"
                onClick={() =>
                  setHasStarted(true)
                }
                aria-label={t(
                  "player.play"
                )}
                className="group absolute inset-0 flex cursor-pointer items-center justify-center overflow-hidden"
              >
                {poster && (
                  <FadeInImage
                    src={poster}
                    alt=""
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                )}

                <div className="absolute inset-0 bg-black/50 transition-colors duration-300 ease-out group-hover:bg-black/35" />

                <span className="absolute h-20 w-20 rounded-full bg-white/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 sm:h-24 sm:w-24" />

                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-300 ease-out group-hover:scale-110 group-hover:border-white/70 group-hover:bg-white/20 sm:h-20 sm:w-20">
                  <Play
                    size={28}
                    className="ml-1 fill-current sm:size-8"
                  />
                </span>
              </button>
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
              {t(
                "player.pickEpisode"
              )}
            </div>
          )}
            </div>
          );
        })()}

        {videoUrl && (
          <AdblockPrompt />
        )}
      </section>
    </div>
  );
});