"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Captions, MonitorPlay, Play, X } from "lucide-react";
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
 * <SubtitleOverlay> never renders on this player. When we have our own
 * Bulgarian subtitles, they go straight into its own player via `sub_url`
 * (shows up as "Custom subtitle" in its captions menu, preselected) — so
 * they work with its own fullscreen and rotation on every device, no
 * overlay needed. Verified 2026-10-10 on Inception (27205). `sub_url` has
 * to be absolute: their player fetches it from its own origin (our
 * /api/subtitles route already sends CORS headers for that).
 * Otherwise, ask it to preselect its own bundled Bulgarian track.
 */
function toPlayableUrl(videoUrl: string, subtitleUrl?: string): string {
  const playableUrl = videoUrl.replace(
    "vidsrc.icu",
    "vidsrc2.ru"
  );

  return appendParams(playableUrl, {
    autoplay: "1",
    sub: DEFAULT_SUBTITLE_LANG,
    ds_lang: DEFAULT_SUBTITLE_LANG,
    sub_url: subtitleUrl
      ? new URL(subtitleUrl, window.location.origin).toString()
      : undefined,
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
 * VidLink — takes our own subtitle file directly (documented `sub_file`: a
 * direct link to a .vtt, plus `sub_label`), so the subtitles live inside
 * its own player — its own captions menu, styling and fullscreen — instead
 * of in <SubtitleOverlay> on top of it. Same catch as EmbedMaster: it never
 * turns our track on by itself, so <ManualSubtitlesHint> asks the viewer
 * to. (It renders cues itself — the <video>'s own <track> for it always
 * reports an error, which says nothing about whether ours show.) Only
 * offered when we have our own Bulgarian subtitles. `sub_file` has to be
 * absolute: their player fetches it from its own origin (our
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

/**
 * EmbedMaster — the best picture we've found (several servers per title,
 * YesMovies often 4K), and it takes our own subtitle file directly
 * (documented `sub_url[]` + `sub_label[]`), so it lands in its own captions
 * menu — no <SubtitleOverlay>, its own fullscreen just works.
 *
 * Two catches, verified 2026-10-10 on Inception, Unabomber and Animals:
 * it never turns our track on by itself (despite their docs saying it does),
 * and it opens on whatever server it picks first (often 720p). Neither can
 * be set from outside — no URL param, no postMessage command — so
 * <ManualSubtitlesHint> below tells the viewer to do both by hand.
 * `sub_url[]` has to be absolute, same as vidsrc2.ru's `sub_url`.
 */
function toEmbedmasterUrl(ref: VidsrcRef, subtitleUrl: string): string {
  const path =
    ref.kind === "movie"
      ? `movie/${ref.tmdbId}`
      : `tv/${ref.tmdbId}/${ref.season}/${ref.episode}`;

  return appendParams(`https://embedmaster.link/${path}`, {
    // Our own Play button already stands in for their welcome page.
    welcome_page: "off",
    autoplay: "on",
    "sub_url[]": new URL(subtitleUrl, window.location.origin).toString(),
    "sub_label[]": "Български",
  });
}

/**
 * Shown over EmbedMaster and VidLink once playback starts with our
 * subtitles in them — the viewer has to switch them on (and, on
 * EmbedMaster, pick the best server) themselves, see the URL builders
 * above. Only the card itself takes clicks; it hides on its own after a
 * while, or with its close button.
 *
 * (VaPlayer / vaplayer.ru was tried here too, 2026-10-10 — it does take
 * our file and usually selects it by itself, but too often showed "all
 * servers failed", so it was dropped.)
 */
const MANUAL_SUBS_HINT_MS = 15_000;

function ManualSubtitlesHint({ withServerTip }: { withServerTip: boolean }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), MANUAL_SUBS_HINT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-3 sm:top-14">
      <div
        role="status"
        className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-white/15 bg-black/75 p-3 text-white shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-4"
      >
        <Captions size={20} className="mt-0.5 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("player.manualSubsTitle")}</p>
          <p className="mt-0.5 text-xs text-white/75 sm:text-sm">
            {t(
              withServerTip
                ? "player.manualSubsSteps"
                : "player.manualSubsStepsNoServer"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label={t("common.close")}
          className="-m-1 shrink-0 cursor-pointer rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

type ProviderId = 1 | 2 | 3 | 4 | 5;

/**
 * VidLink (listed third) is on trial: as of 2026-10-10 it played
 * Unabomber in 1080p with our subtitles, but Animals and Fall 2 never
 * started (their stream host answered 503 every time). Flip this off to
 * drop it again.
 */
const VIDLINK_ENABLED = true;

/**
 * VidLink's stream fails often (see above), and when it does its player
 * just spins forever — no error, no event. It does post documented
 * `PLAYER_EVENT` messages ("play", "timeupdate", …) once the video really
 * runs, so if none arrives this long after it's opened, we move the viewer
 * to vidsrc2.ru (our subtitles switch on there by themselves).
 */
const VIDLINK_ORIGIN = "https://vidlink.pro";
const VIDLINK_START_TIMEOUT_MS = 15_000;
const VIDLINK_FALLBACK_PLAYER: ProviderId = 1;

/** How long the "switched you to another player" note stays up. */
const AUTO_SWITCH_NOTICE_MS = 8_000;

function isVidlinkPlaying(event: MessageEvent): boolean {
  if (event.origin !== VIDLINK_ORIGIN) return false;
  const message = event.data as
    | { type?: unknown; data?: { event?: unknown } }
    | null
    | undefined;
  return (
    message?.type === "PLAYER_EVENT" &&
    (message.data?.event === "play" ||
      message.data?.event === "timeupdate")
  );
}

function AutoSwitchNotice({ from, to }: { from: number; to: number }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), AUTO_SWITCH_NOTICE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-3 sm:top-14">
      <div
        role="status"
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-black/75 p-3 text-sm text-white shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-4"
      >
        <MonitorPlay size={20} className="shrink-0 text-sky-400" />
        <p className="min-w-0">{t("player.autoSwitched", { from, to })}</p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label={t("common.close")}
          className="-m-1 shrink-0 cursor-pointer rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
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
   * Only when we have our own Bulgarian subtitles: EmbedMaster is added
   * first and becomes the default (best picture; our subtitles go into its
   * own player, switched on by hand — see toEmbedmasterUrl), then
   * vidsrc2.ru (ours in its own player, switched on by itself), then
   * VidLink (switched on by hand, while VIDLINK_ENABLED — and swapped for
   * vidsrc2.ru automatically when it doesn't start). VidFast and CineSrc still get
   * <SubtitleOverlay> (toggle/download/info + our fullscreen button) as
   * fallbacks.
   *
   * Without our subtitles it's just vidsrc2.ru, VidFast, CineSrc — each
   * with its own bundled subtitles.
   */
  const hasOwnSubtitles = Boolean(subtitleUrl);

  /**
   * Whether vidsrc2.ru's URL carries our `sub_url`. Same rule as
   * `vidfastUsesOurSubs` below: decided once, when the subtitle check
   * resolves, and only if the viewer isn't already watching vidsrc2.ru by
   * then — adding it would reload the iframe mid-playback. (EmbedMaster
   * needs no such flag: it's only ever listed once our subtitles exist.)
   */
  const [vidsrcUsesOurSubs, setVidsrcUsesOurSubs] =
    useState(false);

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
        ? VIDLINK_ENABLED
          ? [5, 1, 4, 2, 3]
          : [5, 1, 2, 3]
        : [1, 2, 3],
    [hasOwnSubtitles]
  );

  const [activePlayer, setActivePlayer] =
    useState<ProviderId>(1);

  const [hasStarted, setHasStarted] =
    useState(false);

  // Set when VidLink didn't start and we moved the viewer off it (see the
  // watchdog effect below) — drives <AutoSwitchNotice>. Cleared as soon as
  // they pick a player themselves.
  const [autoSwitchedFrom, setAutoSwitchedFrom] =
    useState<ProviderId | null>(null);

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
   * If it resolves before the viewer has started playback, our subtitles
   * are wired into every player, EmbedMaster is added first and — unless
   * they've already picked a player themselves — becomes the selected one.
   * If they're already watching, the player they're on is left alone
   * (changing its URL would reload it mid-playback) and only the others
   * get them; EmbedMaster still shows up in the list.
   */
  useEffect(() => {
    if (!vidsrcRef || vidsrcRef.kind !== "movie") return;

    let cancelled = false;
    const url = `/api/subtitles/${encodeURIComponent(vidsrcRef.tmdbId)}`;

    fetch(url, { cache: "force-cache" })
      .then((res) => {
        if (cancelled || !res.ok) return;
        setSubtitleUrl(url);
        if (!hasStartedRef.current || activePlayerRef.current !== 1) {
          setVidsrcUsesOurSubs(true);
        }
        if (!hasStartedRef.current || activePlayerRef.current !== 2) {
          setVidfastUsesOurSubs(true);
        }
        if (!hasStartedRef.current && !userChangedPlayerRef.current) {
          setActivePlayer(5);
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
        ? toPlayableUrl(
            videoUrl,
            vidsrcUsesOurSubs ? subtitleUrl : undefined
          )
        : "",
    [videoUrl, vidsrcUsesOurSubs, subtitleUrl]
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

  const player5Url = useMemo(
    () =>
      vidsrcRef && subtitleUrl
        ? toEmbedmasterUrl(vidsrcRef, subtitleUrl)
        : null,
    [vidsrcRef, subtitleUrl]
  );

  /**
   * Select active player.
   */
  const playerUrls: Record<ProviderId, string | null> = {
    1: player1Url,
    2: player2Url,
    3: player3Url,
    4: player4Url,
    5: player5Url,
  };
  const activeSrc = playerUrls[activePlayer] || player1Url;

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
    setAutoSwitchedFrom(null);
  }, [videoUrl]);

  /**
   * VidLink watchdog — see VIDLINK_START_TIMEOUT_MS. Armed whenever VidLink
   * is opened (per title/episode, via activeSrc); disarmed for good by its
   * first "play"/"timeupdate" message.
   *
   * A click inside the iframe (e.g. their own play button, when autoplay
   * was blocked) moves focus into it and blurs our window — that re-arms
   * the timer instead, so a viewer who's busy starting it by hand isn't
   * yanked away mid-click.
   */
  useEffect(() => {
    if (!hasStarted || activePlayer !== 4) return;

    let playing = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function arm() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setAutoSwitchedFrom(4);
        setActivePlayer(VIDLINK_FALLBACK_PLAYER);
      }, VIDLINK_START_TIMEOUT_MS);
    }

    function handleMessage(event: MessageEvent) {
      if (playing || !isVidlinkPlaying(event)) return;
      playing = true;
      clearTimeout(timer);
    }

    function handleBlur() {
      if (!playing && document.activeElement instanceof HTMLIFrameElement) {
        arm();
      }
    }

    arm();
    window.addEventListener("message", handleMessage);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("blur", handleBlur);
    };
  }, [hasStarted, activePlayer, activeSrc]);

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
                    provider === 5 ||
                    (provider === 1 && vidsrcUsesOurSubs) ||
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
                      setAutoSwitchedFrom(null);
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

              {autoSwitchedFrom !== null &&
                activePlayer === VIDLINK_FALLBACK_PLAYER && (
                  <AutoSwitchNotice
                    from={playerOrder.indexOf(autoSwitchedFrom) + 1}
                    to={playerOrder.indexOf(activePlayer) + 1}
                  />
                )}

              {((activePlayer === 5 && player5Url) ||
                (activePlayer === 4 && player4Url)) && (
                // Keyed so it shows again for each new title/episode — but
                // not on activeSrc alone, the <iframe> above already is.
                <ManualSubtitlesHint
                  key={`hint:${activeSrc}`}
                  withServerTip={activePlayer === 5}
                />
              )}

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