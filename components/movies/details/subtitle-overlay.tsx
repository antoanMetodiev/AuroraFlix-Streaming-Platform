"use client";

import { useEffect, useRef, useState } from "react";
import {
  Captions,
  CaptionsOff,
  Download,
  Info,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { findActiveCue, parseSubtitles, type SubtitleCue } from "@/lib/vtt-parser";
import { extractTelemetry, PLAYER_ORIGIN, type PlayerId } from "@/lib/player-telemetry";

// Width-based checks flip when a phone rotates into landscape for
// fullscreen — its width can clear 639px even though it's still a phone.
// Coarse pointer + no hover is what actually stays true across rotation.
const MOBILE_QUERY = "(pointer: coarse), (max-width: 639px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

type SubtitleOverlayProps = {
  subtitleUrl: string;
  /** True once the user has pressed the main Play button. */
  active: boolean;
  activePlayer: PlayerId;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** The number the player picker shows for the active player ("Плейър N"),
   *  which differs from `activePlayer`'s internal provider id. */
  playerLabel: number;
};

const DURATION_PADDING_SECONDS = 8;
/** How long we wait for a provider to prove it sends real playback telemetry
 *  before falling back to our own self-timed clock. */
const DETECT_GRACE_MS = 4000;
/** Shifts our cue lookup relative to the provider's reported `currentTime` —
 *  positive pulls cues earlier, negative pushes them later. Only applies to
 *  telemetry mode; the self-timed clock has no such offset to correct for. */
const TELEMETRY_LEAD_SECONDS = 0;

type Mode = "detecting" | "telemetry" | "manual";

type Telemetry = {
  currentTime: number;
  duration: number | null;
  playing: boolean;
  receivedAt: number;
};

/**
 * Renders the Bulgarian subtitles ourselves, on top of the (cross-origin,
 * third-party) video iframe.
 *
 * All three embeds turn out to broadcast their real playback position via
 * `postMessage` (see lib/player-telemetry.ts for exactly what each one
 * sends) — so this listens for that and keeps the subtitles genuinely
 * frame-accurate, seeks included, automatically. If a provider ever stops
 * sending it (they're unofficial, so this can change without notice), this
 * falls back to a self-timed clock with manual transport controls instead
 * of silently going out of sync.
 */
export function SubtitleOverlay({
  subtitleUrl,
  active,
  activePlayer,
  isFullscreen,
  onToggleFullscreen,
  playerLabel,
}: SubtitleOverlayProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [loadError, setLoadError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const [visible, setVisible] = useState(true);
  const [activeText, setActiveText] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("detecting");

  // Manual-mode (fallback) clock state.
  const [isTicking, setIsTicking] = useState(false);
  const [manualDuration, setManualDuration] = useState<number | null>(null);

  const cuesRef = useRef<SubtitleCue[] | null>(null);
  const elapsedRef = useRef(0);
  const modeRef = useRef<Mode>("detecting");
  const isTickingRef = useRef(false);
  const telemetryRef = useRef<Telemetry | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  modeRef.current = mode;
  isTickingRef.current = isTicking;

  // Load + parse the VTT once per subtitle URL.
  useEffect(() => {
    let cancelled = false;

    cuesRef.current = null;
    setLoadError(false);
    elapsedRef.current = 0;
    setActiveText(null);

    fetch(subtitleUrl, { cache: "force-cache" })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`status ${res.status}`))))
      .then((text) => {
        if (cancelled) return;
        const parsed = parseSubtitles(text);
        cuesRef.current = parsed;
        setManualDuration(parsed.length ? parsed[parsed.length - 1].end + DURATION_PADDING_SECONDS : null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(`failed to load/parse subtitles from ${subtitleUrl}`, error);
        setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [subtitleUrl, retryToken]);

  // Reset the sync strategy whenever playback (re)starts or the active
  // player changes — a different player means a different origin/telemetry
  // shape entirely.
  useEffect(() => {
    telemetryRef.current = null;
    lastFrameRef.current = null;

    if (!active) {
      setMode("detecting");
      return;
    }

    setMode("detecting");
    setIsTicking(true);

    const timer = setTimeout(() => {
      setMode((current) => (current === "detecting" ? "manual" : current));
    }, DETECT_GRACE_MS);

    return () => clearTimeout(timer);
  }, [active, activePlayer]);

  // Listen for the provider's real playback position.
  useEffect(() => {
    if (!active) return;

    const expectedOrigin = PLAYER_ORIGIN[activePlayer];

    function handleMessage(event: MessageEvent) {
      if (event.origin !== expectedOrigin) return;

      const update = extractTelemetry(activePlayer, event.data);
      if (!update) return;

      const previous = telemetryRef.current;
      telemetryRef.current = {
        currentTime: update.currentTime ?? previous?.currentTime ?? 0,
        duration: update.duration ?? previous?.duration ?? null,
        playing: update.playing ?? previous?.playing ?? true,
        receivedAt: performance.now(),
      };

      setMode("telemetry");
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [active, activePlayer]);

  // Single render loop: in "telemetry" mode it interpolates from the last
  // provider update; in "manual" mode it's a plain self-timed clock.
  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (modeRef.current === "telemetry" && telemetryRef.current) {
        const tel = telemetryRef.current;
        const projected =
          (tel.playing ? tel.currentTime + (now - tel.receivedAt) / 1000 : tel.currentTime) +
          TELEMETRY_LEAD_SECONDS;
        const next = tel.duration ? Math.min(tel.duration, Math.max(0, projected)) : Math.max(0, projected);
        elapsedRef.current = next;
      } else if (modeRef.current === "manual" && isTickingRef.current && lastFrameRef.current !== null) {
        const delta = (now - lastFrameRef.current) / 1000;
        const next = manualDuration
          ? Math.min(manualDuration, elapsedRef.current + delta)
          : elapsedRef.current + delta;
        elapsedRef.current = next;
      }

      lastFrameRef.current = now;

      // Hidden while the provider reports the video as paused: that's
      // usually when people open the player's own settings menu, which
      // opens in the middle of the frame — right where long subtitle lines
      // would sit on top of it. (Providers don't report the menu itself.)
      const isPaused = modeRef.current === "telemetry" && telemetryRef.current?.playing === false;

      const activeCues = cuesRef.current;
      const cue = activeCues && !isPaused ? findActiveCue(activeCues, elapsedRef.current) : null;
      setActiveText(cue?.text ?? null);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = null;
    };
  }, [active, manualDuration]);

  useEffect(() => {
    if (!infoOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setInfoOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [infoOpen]);

  if (!active || !subtitleUrl) {
    return null;
  }

  return (
    <>
      {visible && activeText && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 sm:bottom-6">
          <p className="max-w-[92%] whitespace-pre-line rounded-md bg-black/70 px-2.5 py-1 text-center font-semibold text-white shadow-[0_2px_14px_rgba(0,0,0,0.7)] text-[clamp(0.8rem,2.6vw,2.75rem)] leading-tight sm:rounded-lg sm:px-4 sm:py-2">
            {activeText}
          </p>
        </div>
      )}

      {/* Toggle cluster — deliberately in a top corner so it never collides
          with the provider's own bottom control bar. */}
      <div className="pointer-events-auto absolute top-2 right-2 z-20 flex items-center gap-0.5 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur-md sm:top-3 sm:right-3 sm:gap-1 sm:p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        {loadError ? (
          <button
            type="button"
            onClick={() => setRetryToken((n) => n + 1)}
            title={`${t("subtitles.error")} — ${t("subtitles.retry")}`}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {t("subtitles.retry")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setVisible((prev) => !prev)}
              aria-label={visible ? t("subtitles.hide") : t("subtitles.show")}
              title={visible ? t("subtitles.hide") : t("subtitles.show")}
              className="flex items-center rounded-full p-1.5 text-white/80 sm:p-2 transition-colors hover:bg-white/10 hover:text-white"
            >
              {visible ? <Captions size={isMobile ? 16 : 19} /> : <CaptionsOff size={isMobile ? 16 : 19} />}
            </button>

            <a
              href={subtitleUrl}
              download="Bulgarian.vtt"
              aria-label={t("subtitles.download")}
              title={t("subtitles.downloadHint")}
              className="flex items-center rounded-full p-1.5 text-white/80 sm:p-2 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download size={isMobile ? 16 : 19} />
            </a>

            <div ref={infoRef} className="relative">
              <button
                type="button"
                onClick={() => setInfoOpen((prev) => !prev)}
                aria-label={t("subtitles.info")}
                title={t("subtitles.info")}
                className={`flex items-center rounded-full p-1.5 transition-colors sm:p-2 hover:bg-white/10 hover:text-white ${
                  infoOpen ? "bg-white/10 text-white" : "text-white/80"
                }`}
              >
                <Info size={isMobile ? 16 : 19} />
              </button>

              {infoOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-white/10 bg-surface/95 p-3.5 text-sm leading-relaxed text-foreground/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                  <p>
                    {mode === "manual" ? t("subtitles.infoBody") : t("subtitles.infoBodySynced")}
                  </p>
                  <p className="mt-2 border-t border-foreground/10 pt-2 text-foreground/70">
                    {t("subtitles.infoDoubleTip")}
                  </p>
                  {activePlayer !== 1 && (
                    <p className="mt-2 border-t border-foreground/10 pt-2 text-foreground/70">
                      {t("subtitles.infoManualTip", { player: String(playerLabel) })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* The provider's own fullscreen control conventionally sits right in
          this bottom-right corner. We can't reach into their DOM to remove
          it, but a click-catcher flush against the very corner — bigger
          than the visible button itself — reliably lands on ours first
          across all three players' slightly different icon placements, so
          people never end up on the one that would hide the subtitles. */}
      {(() => {
        // On mobile in fullscreen, the corner sits a bit further in than on
        // desktop — this only nudges position.
        const bigOnMobile = isFullscreen && isMobile;
        // VidFast's bar on a phone (not fullscreen) ends in a picture-in-
        // picture button, which pushes its settings gear to exactly where
        // our button sits on desktop — so there it goes right into the
        // corner instead, over the PiP button.
        const smallVidfast = isMobile && !isFullscreen;
        const hitSize = 56;
        // A bit smaller on phones. The hit area stays the same size and the
        // button stays centered in it, so this doesn't move it.
        const visibleSize = isMobile ? 36 : 42;
        const glowSize = isMobile ? 34 : 40;
        const iconSize = isMobile ? 16 : 18;
        const label = isFullscreen ? t("subtitles.exitFullscreen") : t("subtitles.fullscreen");

        return (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={label}
            // CineSrc's own icon sits a hair further left than the other two
            // providers', VidFast's sits further in on both axes (its UI is
            // drawn scaled down — see VIDFAST_UI_SCALE in player-section),
            // the corner sits a couple px further in once we're actually in
            // the big view, and phones need a bit more still.
            style={{
              right:
                (activePlayer === 3 ? 3 : 0) +
                (activePlayer === 2 ? (smallVidfast ? -4 : 19) : 0) +
                (isFullscreen ? 2 : 0) +
                (bigOnMobile ? 5 : 0) -
                (bigOnMobile && activePlayer === 2 ? 6 : 0),
              bottom:
                (activePlayer === 2 ? (smallVidfast ? -4 : 8) : 0) +
                (isFullscreen ? 2 : 0) +
                (bigOnMobile ? 5 : 0) -
                (bigOnMobile && activePlayer === 2 ? 10 : 0),
              width: hitSize,
              height: hitSize,
            }}
            className="group pointer-events-auto absolute z-30 flex items-center justify-center"
          >
            <span
              className="absolute rounded-2xl bg-white/40 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
              style={{ width: glowSize, height: glowSize }}
            />
            <span
              className="relative flex items-center justify-center rounded-[14px] bg-gradient-to-b from-white/15 to-white/[0.05] text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.75)] ring-[0.5px] ring-white/15 backdrop-blur-xl transition-all duration-200 ease-out ring-inset group-hover:-translate-y-0.5 group-hover:bg-white group-hover:from-white group-hover:to-white group-hover:text-neutral-900 group-hover:ring-transparent group-active:translate-y-0 group-active:scale-95"
              style={{ width: visibleSize, height: visibleSize }}
            >
              {isFullscreen ? (
                <Minimize2 size={iconSize} strokeWidth={2.25} className="transition-transform duration-200 group-hover:scale-90" />
              ) : (
                <Maximize2 size={iconSize} strokeWidth={2.25} className="transition-transform duration-200 group-hover:scale-110" />
              )}
            </span>
          </button>
        );
      })()}
    </>
  );
}
