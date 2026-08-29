"use client";

import { useEffect, useRef, useState } from "react";
import {
  Captions,
  CaptionsOff,
  Download,
  Info,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { findActiveCue, parseSubtitles, type SubtitleCue } from "@/lib/vtt-parser";
import { extractTelemetry, PLAYER_ORIGIN, type PlayerId } from "@/lib/player-telemetry";

const MOBILE_QUERY = "(max-width: 639px)";

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
};

const JUMP_SECONDS = 10;
const DURATION_PADDING_SECONDS = 8;
/** How long we wait for a provider to prove it sends real playback telemetry
 *  before falling back to our own self-timed clock. */
const DETECT_GRACE_MS = 4000;
/** Shifts our cue lookup relative to the provider's reported `currentTime` —
 *  positive pulls cues earlier, negative pushes them later. Only applies to
 *  telemetry mode; the self-timed clock has no such offset to correct for. */
const TELEMETRY_LEAD_SECONDS = 0.25;

type Mode = "detecting" | "telemetry" | "manual";

type Telemetry = {
  currentTime: number;
  duration: number | null;
  playing: boolean;
  receivedAt: number;
};

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const ss = (total % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

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
}: SubtitleOverlayProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [cues, setCues] = useState<SubtitleCue[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const [visible, setVisible] = useState(true);
  const [activeText, setActiveText] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("detecting");

  // Manual-mode (fallback) clock state.
  const [isTicking, setIsTicking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualDuration, setManualDuration] = useState<number | null>(null);

  const cuesRef = useRef<SubtitleCue[] | null>(null);
  const elapsedRef = useRef(0);
  const modeRef = useRef<Mode>("detecting");
  const isTickingRef = useRef(false);
  const telemetryRef = useRef<Telemetry | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const wasTickingRef = useRef(false);
  const infoRef = useRef<HTMLDivElement>(null);

  modeRef.current = mode;
  isTickingRef.current = isTicking;

  // Load + parse the VTT once per subtitle URL.
  useEffect(() => {
    let cancelled = false;

    setCues(null);
    setLoadError(false);
    setElapsed(0);
    elapsedRef.current = 0;
    setActiveText(null);

    fetch(subtitleUrl, { cache: "force-cache" })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`status ${res.status}`))))
      .then((text) => {
        if (cancelled) return;
        const parsed = parseSubtitles(text);
        cuesRef.current = parsed;
        setCues(parsed);
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
        setElapsed(next);
      } else if (modeRef.current === "manual" && isTickingRef.current && lastFrameRef.current !== null) {
        const delta = (now - lastFrameRef.current) / 1000;
        const next = manualDuration
          ? Math.min(manualDuration, elapsedRef.current + delta)
          : elapsedRef.current + delta;
        elapsedRef.current = next;
        setElapsed(next);
      }

      lastFrameRef.current = now;

      const activeCues = cuesRef.current;
      const cue = activeCues ? findActiveCue(activeCues, elapsedRef.current) : null;
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

  function seekTo(nextSeconds: number) {
    const clamped = Math.max(0, manualDuration ? Math.min(manualDuration, nextSeconds) : nextSeconds);
    elapsedRef.current = clamped;
    setElapsed(clamped);

    const activeCues = cuesRef.current;
    const cue = activeCues ? findActiveCue(activeCues, clamped) : null;
    setActiveText(cue?.text ?? null);
  }

  if (!active || !subtitleUrl) {
    return null;
  }

  const percent = manualDuration ? Math.min(100, (elapsed / manualDuration) * 100) : 0;

  return (
    <>
      {visible && activeText && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center px-4 sm:bottom-20">
          <p className="max-w-[92%] whitespace-pre-line rounded-lg bg-black/70 px-4 py-2 text-center font-semibold text-white shadow-[0_2px_14px_rgba(0,0,0,0.7)] text-[clamp(1.15rem,2.6vw,2.75rem)] leading-tight">
            {activeText}
          </p>
        </div>
      )}

      {/* Toggle cluster — deliberately in a top corner so it never collides
          with the provider's own bottom control bar. */}
      <div className="pointer-events-auto absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-1.5 py-1.5 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
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
              className="flex items-center rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {visible ? <Captions size={19} /> : <CaptionsOff size={19} />}
            </button>

            <a
              href={subtitleUrl}
              download="Bulgarian.vtt"
              aria-label={t("subtitles.download")}
              title={t("subtitles.downloadHint")}
              className="flex items-center rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download size={19} />
            </a>

            <div ref={infoRef} className="relative">
              <button
                type="button"
                onClick={() => setInfoOpen((prev) => !prev)}
                aria-label={t("subtitles.info")}
                title={t("subtitles.info")}
                className={`flex items-center rounded-full p-2 transition-colors hover:bg-white/10 hover:text-white ${
                  infoOpen ? "bg-white/10 text-white" : "text-white/80"
                }`}
              >
                <Info size={19} />
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
                      {t("subtitles.infoManualTip", { player: String(activePlayer) })}
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
        // On mobile, once we're actually in the big view, the provider's
        // own icon still peeked out from behind small position nudges — so
        // instead of chasing its exact spot, the click-catcher just grows
        // enough there to swallow that whole corner outright.
        const bigOnMobile = isFullscreen && isMobile;
        const hitSize = bigOnMobile ? 88 : 56;
        const visibleSize = bigOnMobile ? 68 : 44;
        const glowSize = bigOnMobile ? 44 : 36;
        const iconSize = bigOnMobile ? 26 : 18;

        return (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? t("subtitles.exitFullscreen") : t("subtitles.fullscreen")}
            title={isFullscreen ? t("subtitles.exitFullscreen") : t("subtitles.fullscreen")}
            // CineSrc's own icon sits a hair further left than the other two
            // providers', and the corner sits a couple px further in once
            // we're actually in the big view.
            style={{
              right: (activePlayer === 3 ? 3 : 0) + (isFullscreen ? 2 : 0),
              bottom: isFullscreen ? 2 : 0,
              width: hitSize,
              height: hitSize,
            }}
            className="group pointer-events-auto absolute z-30 flex items-center justify-center"
          >
            <span
              className="absolute rounded-full bg-white/25 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100"
              style={{ width: glowSize, height: glowSize }}
            />
            <span
              className="relative flex items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 ease-out group-hover:scale-110 group-hover:border-white/35 group-hover:bg-black/80 group-active:scale-95"
              style={{ width: visibleSize, height: visibleSize }}
            >
              {isFullscreen ? <Minimize2 size={iconSize} /> : <Maximize2 size={iconSize} />}
            </span>
          </button>
        );
      })()}

      {/* Manual transport controls — only shown when a provider hasn't
          proven it sends real playback telemetry within the grace period. */}
      {mode === "manual" && !loadError && (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={() => seekTo(elapsedRef.current - JUMP_SECONDS)}
            aria-label={t("subtitles.jumpBack")}
            title={t("subtitles.jumpBack")}
            className="flex items-center rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={18} />
          </button>

          <button
            type="button"
            onClick={() => setIsTicking((prev) => !prev)}
            aria-label={isTicking ? t("subtitles.pause") : t("subtitles.play")}
            title={isTicking ? t("subtitles.pause") : t("subtitles.play")}
            className="flex items-center justify-center rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
          >
            {isTicking ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            type="button"
            onClick={() => seekTo(elapsedRef.current + JUMP_SECONDS)}
            aria-label={t("subtitles.jumpForward")}
            title={t("subtitles.jumpForward")}
            className="flex items-center rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RotateCw size={18} />
          </button>

          <span className="min-w-[2.8rem] font-mono text-sm text-white/70">{formatClock(elapsed)}</span>

          <input
            type="range"
            min={0}
            max={manualDuration ?? 0}
            step={1}
            value={Math.min(elapsed, manualDuration ?? 0)}
            disabled={!manualDuration}
            onPointerDown={() => {
              wasTickingRef.current = isTicking;
              setIsTicking(false);
            }}
            onChange={(event) => seekTo(Number(event.target.value))}
            onPointerUp={() => {
              if (wasTickingRef.current) setIsTicking(true);
            }}
            aria-label={t("subtitles.seekLabel")}
            style={{
              background: `linear-gradient(to right, white ${percent}%, rgba(255,255,255,0.22) ${percent}%)`,
            }}
            className="h-2 w-32 cursor-pointer appearance-none rounded-full disabled:cursor-default disabled:opacity-30 sm:w-48 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          />

          <span className="min-w-[2.8rem] text-right font-mono text-sm text-white/70">
            {manualDuration ? formatClock(manualDuration) : "--:--"}
          </span>
        </div>
      )}
    </>
  );
}
