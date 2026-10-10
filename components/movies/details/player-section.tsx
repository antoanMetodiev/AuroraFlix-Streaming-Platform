"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Captions, MonitorPlay, Play } from "lucide-react";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { Spinner } from "@/components/ui/loader";
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

/**
 * iPhone Safari (and every iPhone browser, since they're all WebKit) has no
 * Fullscreen API for anything but a bare <video> — `requestFullscreen` and
 * `webkitRequestFullscreen` simply don't exist on other elements there.
 */
function canRequestFullscreen(el: HTMLElement): boolean {
  const doc = document as PrefixedFullscreenDocument & {
    webkitFullscreenEnabled?: boolean;
  };
  const target = el as PrefixedFullscreenElement;
  return Boolean(
    (document.fullscreenEnabled || doc.webkitFullscreenEnabled) &&
      (target.requestFullscreen || target.webkitRequestFullscreen)
  );
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
 * <SubtitleOverlay> never renders on this player (only on VidFast and
 * CineSrc — see `hasOwnSubtitles` below), so it never competes with this
 * provider's own bundled subtitle — always
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
 * VidFast's own controls are rendered this much smaller — see the iframe
 * below. Their embed has no size/scale option (documented params: title,
 * poster, autoPlay, startAt, theme, server, hideServer, fullscreenButton,
 * chromecast, sub, nextButton, autoNext), and CSS can't reach into a
 * cross-origin iframe, so the iframe itself is laid out at 1/scale of the
 * box and scaled back down: the video still fills the frame, everything
 * drawn on top of it shrinks.
 */
const VIDFAST_UI_SCALE = 0.7;

/** VidFast's accent color (their `theme` param, hex without the #). */
const VIDFAST_THEME = "2980B9";

/**
 * VidFast
 *
 * Always in blue (theme), with the poster shown before playback, and
 * without their big title overlay and the Chromecast button. For episodes,
 * also their "next episode" button and auto-advance to the next one.
 *
 * When we have our own Bulgarian subtitles, <SubtitleOverlay> renders them
 * on top of this player (see `vidfastUsesOurSubs` below), so its own
 * bundled track is left off to avoid two subtitles at once, and so is its
 * fullscreen button — ours takes its place, and theirs would fullscreen
 * just the iframe and hide our subtitles.
 * Otherwise, same as vidsrc2.ru above: ask it to preselect Bulgarian.
 */
function toVidfastUrl(ref: VidsrcRef, withOwnSubtitles: boolean): string {
  const path =
    ref.kind === "movie"
      ? `movie/${ref.tmdbId}`
      : `tv/${ref.tmdbId}/${ref.season}/${ref.episode}`;

  const common = {
    autoPlay: "true",
    title: "false",
    poster: "true",
    theme: VIDFAST_THEME,
    chromecast: "false",
    ...(ref.kind === "tv"
      ? { nextButton: "true", autoNext: "true" }
      : {}),
  };

  return appendParams(
    `https://vidfast.vc/${path}`,
    withOwnSubtitles
      ? { ...common, fullscreenButton: "false" }
      : {
          ...common,
          sub: DEFAULT_SUBTITLE_LANG,
          lang: DEFAULT_SUBTITLE_LANG,
        }
  );
}

/**
 * CineSrc — <SubtitleOverlay> renders on it (and on VidFast).
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

/**
 * VidLink — the one provider that takes our own subtitle file directly
 * (documented `sub_file`: a direct link to a .vtt, plus `sub_label`), so
 * the subtitles live inside its own player — its own captions menu,
 * styling and fullscreen — instead of in <SubtitleOverlay> on top of it.
 * Only offered when we have our own Bulgarian subtitles. `sub_file` has to
 * be absolute: their player fetches it from its own origin (our
 * /api/subtitles route already sends CORS headers for that).
 */
function toVidlinkUrl(ref: VidsrcRef, subtitleUrl: string): string {
  const path =
    ref.kind === "movie"
      ? `movie/${ref.tmdbId}`
      : `tv/${ref.tmdbId}/${ref.season}/${ref.episode}`;

  return appendParams(`https://vidlink.pro/${path}`, {
    autoplay: "true",
    sub_file: new URL(subtitleUrl, window.location.origin).toString(),
    sub_label: "Български",
  });
}

type ProviderId = 1 | 2 | 3 | 4;

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
   * When we have our own Bulgarian subtitles, VidFast is listed first and
   * is the default — it plays more reliably than CineSrc. Both get the same
   * full <SubtitleOverlay> (toggle/download/info + our fullscreen button);
   * CineSrc moves behind vidsrc2.ru (which keeps its own bundled
   * subtitles), and VidLink — with our subtitles built into its own player
   * — is added as a fourth option.
   */
  const hasOwnSubtitles = Boolean(subtitleUrl);

  /**
   * Whether VidFast's URL was built without its own subtitle track, i.e.
   * whether our overlay should render on it. Decided once, when the
   * subtitle check resolves — and only if the viewer isn't already
   * watching VidFast by then, since switching its URL would reload the
   * iframe mid-playback.
   */
  const [vidfastUsesOurSubs, setVidfastUsesOurSubs] =
    useState(false);

  const playerOrder = useMemo<
    readonly ProviderId[]
  >(
    () =>
      hasOwnSubtitles
        ? [2, 1, 3, 4]
        : [1, 2, 3],
    [hasOwnSubtitles]
  );

  const [activePlayer, setActivePlayer] =
    useState<ProviderId>(1);

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
  const activePlayerRef = useRef(activePlayer);
  useEffect(() => {
    activePlayerRef.current = activePlayer;
  }, [activePlayer]);

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

      // Same trick for both players our overlay renders on — CineSrc, and
      // VidFast once its URL was built without its own subtitle track.
      const overlayIsOnActivePlayer =
        hasOwnSubtitles &&
        (activePlayer === 3 ||
          (activePlayer === 2 && vidfastUsesOurSubs));

      if (current && overlayIsOnActivePlayer) {
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
  }, [hasOwnSubtitles, activePlayer, vidfastUsesOurSubs]);

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
    // Hides the site header and the mobile tab bar (see globals.css). The
    // big view sits inside the details page's `isolate` wrapper, so no
    // z-index can lift it above those two — they're simply taken away.
    document.documentElement.setAttribute("data-player-big-view", "");
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.removeAttribute("data-player-big-view");
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
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // No real fullscreen for our wrapper here (iPhone) — fall back to the
    // CSS big view, which still covers the screen *with* our subtitles.
    // Same if the browser turns the request down for any other reason.
    if (!canRequestFullscreen(container)) {
      setIsBigView(true);
      return;
    }
    requestFullscreen(container)?.catch(() => setIsBigView(true));
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
   * the player selector themselves — the VidFast-first default is applied
   * retroactively via setActivePlayer(2), same preference the old
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
        if (!hasStartedRef.current || activePlayerRef.current !== 2) {
          setVidfastUsesOurSubs(true);
        }
        if (!hasStartedRef.current && !userChangedPlayerRef.current) {
          setActivePlayer(2);
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
   * Build all the player URLs.
   *
   * Our Bulgarian subtitles are rendered by <SubtitleOverlay> below, on top
   * of VidFast and CineSrc — see the comments on the URL builders above.
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
        ? toVidfastUrl(vidsrcRef, vidfastUsesOurSubs)
        : null,
    [vidsrcRef, vidfastUsesOurSubs]
  );

  const player3Url = useMemo(
    () =>
      vidsrcRef
        ? toCinesrcUrl(vidsrcRef)
        : null,
    [vidsrcRef]
  );

  const player4Url = useMemo(
    () =>
      vidsrcRef && subtitleUrl
        ? toVidlinkUrl(vidsrcRef, subtitleUrl)
        : null,
    [vidsrcRef, subtitleUrl]
  );

  /**
   * Select active player.
   */
  const activeSrc =
    activePlayer === 2 && player2Url
      ? player2Url
      : activePlayer === 3 && player3Url
        ? player3Url
        : activePlayer === 4 && player4Url
          ? player4Url
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
        // While in the big view the section carries no `translate` at all:
        // any transform on an ancestor becomes the containing block for
        // `position: fixed`, which would shrink the big view to this section.
        className={`mx-auto flex max-w-[80rem] flex-col items-center px-4 py-16 transition-all duration-700 sm:px-6 sm:py-20 ${
          isBigView
            ? "opacity-100"
            : inView
              ? "translate-y-0 opacity-100"
              : "translate-y-14 opacity-0"
        }`}
      >
        {/*
         * All players are laid out as one always-visible segmented control
         * instead of a dropdown — viewers didn't notice the old closed
         * <ModernSelect> and stayed stuck on player 1 even when it didn't
         * work for them. With three options there's room to show them all.
         */}
        {videoUrl && vidsrcRef && playerOrder.length > 1 && (
          <div className="mb-4 flex w-full max-w-[80rem] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                <MonitorPlay size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white sm:text-base">
                  {t("player.choose")}
                </p>
                <p className="text-xs text-white/60 sm:text-sm">
                  {t("player.hint")}
                </p>
              </div>
            </div>

            <div
              role="radiogroup"
              aria-label={t("player.choose")}
              className={`grid gap-2 sm:flex sm:shrink-0 ${
                playerOrder.length === 4 ? "grid-cols-2" : "grid-cols-3"
              }`}
            >
              {playerOrder.map((provider, index) => {
                const isActive = provider === activePlayer;
                const hasBgSubtitles =
                  hasOwnSubtitles &&
                  (provider === 3 ||
                    provider === 4 ||
                    (provider === 2 && vidfastUsesOurSubs));
                return (
                  <button
                    key={provider}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    title={hasBgSubtitles ? t("player.bgSubtitles") : undefined}
                    onClick={() => {
                      userChangedPlayerRef.current = true;
                      setActivePlayer(provider);
                    }}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 sm:px-5 sm:text-sm ${
                      isActive
                        ? "border-transparent bg-white text-neutral-900 shadow-[0_4px_24px_-4px_rgba(255,255,255,0.55)]"
                        : "border-white/20 bg-white/5 text-white/85 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {t("player.player")} {index + 1}
                    {hasBgSubtitles && (
                      <Captions
                        size={16}
                        aria-label={t("player.bgSubtitles")}
                        className={isActive ? "text-emerald-600" : "text-emerald-400"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
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
                className={
                  activePlayer === 2
                    ? "absolute top-0 left-0 origin-top-left border-0"
                    : "h-full w-full border-0"
                }
                style={
                  activePlayer === 2
                    ? {
                        width: `${100 / VIDFAST_UI_SCALE}%`,
                        height: `${100 / VIDFAST_UI_SCALE}%`,
                        transform: `scale(${VIDFAST_UI_SCALE})`,
                      }
                    : undefined
                }
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

              {subtitleUrl &&
                (activePlayer === 3 ||
                  (activePlayer === 2 && vidfastUsesOurSubs)) && (
                <SubtitleOverlay
                  subtitleUrl={subtitleUrl}
                  active={hasStarted}
                  activePlayer={activePlayer}
                  isFullscreen={isRealFullscreen || isBigView}
                  onToggleFullscreen={toggleFullscreen}
                  playerLabel={playerOrder.indexOf(activePlayer) + 1}
                />
              )}
            </>
          );

          /**
           * The same element in both modes, just restyled for the big view —
           * it used to be portalled to <body> instead, which remounted the
           * iframe and reloaded the provider's player on every switch (and on
           * iPhone, where autoplay with sound is blocked, left it stopped).
           */
          return (
            <div
              ref={containerRef}
              className={
                isBigView
                  ? "animate-big-view-in fixed inset-0 z-[100] overflow-hidden bg-black"
                  : "relative aspect-video w-full max-w-[80rem] overflow-hidden rounded-2xl bg-black shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)]"
              }
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