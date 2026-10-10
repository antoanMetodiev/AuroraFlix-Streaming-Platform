"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Volume1, Volume2, VolumeX } from "lucide-react";
import { HeroBackground } from "@/components/home/hero-background";
import type { HeroItem } from "@/components/home/hero-item";
import { AddToWatchlistButton } from "@/components/movies/details/add-to-watchlist-button";
import { LikeButton } from "@/components/movies/details/like-button";
import { RatingRing } from "@/components/ui/rating-ring";
import { getMovieSlug, tmdbImage } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Series } from "@/types/series";
import type { Movie } from "@/types/movie";

/** Remembered across visits — but only read once the viewer unmutes. */
const VOLUME_STORAGE_KEY = "aurora_hero_volume";
const DEFAULT_VOLUME = 60;

const SWIPE_THRESHOLD_PX = 50;

function readSavedVolume(): number {
  try {
    const saved = Number(window.localStorage.getItem(VOLUME_STORAGE_KEY));
    return saved > 0 && saved <= 100 ? saved : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function saveVolume(volume: number) {
  try {
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
  } catch {
    // Private mode / blocked storage — the volume just isn't remembered.
  }
}

/**
 * Speaker button + volume slider. The slider unfolds on hover/focus, and
 * only on mouse/trackpad devices — on phones (iOS above all) a page can't
 * set a video's volume at all, that's the hardware buttons' job, so there
 * it's just the mute toggle.
 *
 * While muted the slider sits at 0; unmuting (button, or dragging the
 * slider up) brings back the last volume, remembered across visits.
 */
function VolumeControl({
  muted,
  volume,
  disabled,
  onMutedChange,
  onVolumeChange,
}: {
  muted: boolean;
  volume: number;
  disabled: boolean;
  onMutedChange: (muted: boolean) => void;
  onVolumeChange: (volume: number) => void;
}) {
  const { t } = useTranslation();
  const shown = muted ? 0 : volume;
  const Icon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div
      className={`group/volume flex items-center rounded-full border border-white/15 bg-black/45 p-1 backdrop-blur-md transition-opacity ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onMutedChange(!muted)}
        aria-label={muted ? t("hero.unmute") : t("hero.mute")}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white hover:text-black sm:h-10 sm:w-10"
      >
        <Icon size={18} />
      </button>
      <div className="hidden w-0 overflow-hidden transition-[width] duration-300 ease-out pointer-fine:flex pointer-fine:group-hover/volume:w-28 pointer-fine:group-focus-within/volume:w-28">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={shown}
          disabled={disabled}
          aria-label={t("hero.volume")}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          className="hero-volume mx-3 w-22"
          style={{ "--fill": `${shown}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}

/** How far the mouse has to move before a press on the rail counts as a drag. */
const DRAG_THRESHOLD_PX = 6;

/**
 * The strip of trailers along the bottom: each title's backdrop as a
 * thumbnail, the playing one lit up with a bar filling as its trailer
 * plays. Slides sideways like a carousel — fingers natively, a mouse by
 * grabbing and dragging (scrollbar hidden either way) — and keeps the
 * playing card centred, by scrolling the strip itself, never the page.
 */
function TrailerRail({
  items,
  currentIndex,
  progress,
  onSelect,
}: {
  items: HeroItem[];
  currentIndex: number;
  progress: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLUListElement>(null);
  const [dragging, setDragging] = useState(false);
  // Swallows the click that ends a drag, so letting go over a card doesn't
  // also switch to it.
  const suppressClickRef = useRef(false);

  // Mouse drag-to-scroll. Touch already scrolls the strip natively, so only
  // a mouse's primary button starts one. Snapping is off while dragging (it
  // would fight every scrollLeft write) and comes back on release, settling
  // on the nearest card.
  function handlePointerDown(event: React.PointerEvent<HTMLUListElement>) {
    const list = listRef.current;
    if (!list || event.pointerType !== "mouse" || event.button !== 0) return;

    const startX = event.clientX;
    const startScroll = list.scrollLeft;
    let moved = false;

    function handleMove(moveEvent: PointerEvent) {
      const delta = moveEvent.clientX - startX;
      if (!moved && Math.abs(delta) < DRAG_THRESHOLD_PX) return;
      if (!moved) {
        moved = true;
        setDragging(true);
      }
      list!.scrollLeft = startScroll - delta;
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (moved) {
        suppressClickRef.current = true;
        setDragging(false);
      }
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  useEffect(() => {
    const list = listRef.current;
    const card = list?.children[currentIndex] as HTMLElement | undefined;
    if (!list || !card) return;
    list.scrollTo({
      left: card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [currentIndex]);

  return (
    <ul
      ref={listRef}
      aria-label={t("hero.trailers")}
      onPointerDown={handlePointerDown}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      // Keeps the browser's own image/link drag from hijacking a mouse drag.
      onDragStart={(event) => event.preventDefault()}
      className={`scrollbar-none -mx-1 flex gap-2.5 overflow-x-auto px-1 py-1.5 select-none sm:gap-3 pointer-fine:cursor-grab ${
        dragging ? "pointer-fine:cursor-grabbing" : "snap-x"
      }`}
    >
      {items.map((item, index) => {
        const isActive = index === currentIndex;
        const image =
          tmdbImage(item.record.backgroundImg_URL, "w300") ?? tmdbImage(item.record.posterImgURL, "w342");

        return (
          <li key={item.record.id} className="shrink-0 snap-center">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`${t("hero.show")} ${item.record.title}`}
              aria-current={isActive}
              className={`group/thumb relative block aspect-video w-28 cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 sm:w-36 lg:w-44 ${
                isActive
                  ? "border-white/80 opacity-100 shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                  : "border-white/10 opacity-55 hover:-translate-y-1 hover:border-white/40 hover:opacity-100"
              }`}
            >
              {image && (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 112px"
                  className="object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <span className="absolute inset-x-2 bottom-1.5 text-left">
                <span className="block text-[9px] font-bold tracking-[0.15em] text-white/60 uppercase sm:text-[10px]">
                  {item.type === "series" ? t("hero.badgeSeries") : t("hero.badgeMovie")}
                </span>
                <span className="line-clamp-1 text-[11px] font-semibold text-white sm:text-xs">{item.record.title}</span>
              </span>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                  <span
                    className="block h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-[width] duration-300 ease-linear"
                    style={{ width: `${progress * 100}%` }}
                  />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function HeroSection({ items }: { items: HeroItem[] }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  // Whether `volume` has been loaded from storage yet — done lazily on the
  // first unmute (an event, so no hydration mismatch from reading it during
  // render).
  const volumeLoadedRef = useRef(false);
  // 0–1, how far the current trailer has played — fills its rail card.
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // Fires once on first paint only — HeroSection never remounts on
  // prev/next/dot navigation (only HeroBackground does, via its own key), so
  // this plays the entrance once and stays out of the way of carousel clicks.
  // A plain setTimeout rather than requestAnimationFrame — rAF is paused for
  // backgrounded/hidden tabs (e.g. a middle-click "open in new tab"), which
  // would leave the entrance stuck invisible until the tab is focused.
  // Gates the mute/unmute button — toggling mute against a player that
  // hasn't started yet (or is still buffering) is what triggers the
  // pause-instead-of-unmute bug on some mobile browsers, so the button stays
  // inert until HeroBackground reports its player is actually ready.
  const [isVideoReady, setIsVideoReady] = useState(false);

  const current = items[currentIndex];

  // Resetting isVideoReady lives in these event handlers rather than a
  // useEffect keyed on the current record — HeroBackground already fully
  // remounts on change (key={...}), so every path that changes currentIndex
  // is a plain user-triggered event, not something that needs to be derived
  // reactively from a prop.
  const goTo = useCallback(
    (resolveIndex: (prev: number) => number) => {
      setIsVideoReady(false);
      setProgress(0);
      setCurrentIndex((prev) => {
        const next = resolveIndex(prev);
        return ((next % items.length) + items.length) % items.length;
      });
    },
    [items.length]
  );

  const goToPrevious = useCallback(() => goTo((prev) => prev - 1), [goTo]);
  const goToNext = useCallback(() => goTo((prev) => prev + 1), [goTo]);

  function changeMuted(nextMuted: boolean) {
    if (!nextMuted && !volumeLoadedRef.current) {
      volumeLoadedRef.current = true;
      setVolume(readSavedVolume());
    }
    setMuted(nextMuted);
  }

  function changeVolume(nextVolume: number) {
    volumeLoadedRef.current = true;
    if (nextVolume === 0) {
      setMuted(true);
      return;
    }
    setVolume(nextVolume);
    saveVolume(nextVolume);
    setMuted(false);
  }

  // ←/→ switch trailers while the hero is what's on screen — not once the
  // page is scrolled past it, and never while typing or on a slider (the
  // volume one uses the arrow keys itself).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < window.innerHeight / 2) return;
      if (event.key === "ArrowLeft") goToPrevious();
      else goToNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (!current) {
    return (
      <section className="relative flex h-[calc(70vh-4rem)] w-full items-center justify-center bg-background text-foreground sm:h-[calc(100dvh-4rem)]">
        <h1 className="px-6 text-center text-2xl font-semibold text-foreground/80 sm:text-3xl">
          {t("hero.welcome")}
        </h1>
      </section>
    );
  }

  const { record, type } = current;
  const description = record.description ?? "";
  const truncatedDescription = description.length > 230 ? `${description.slice(0, 230)}..` : description;
  // Series are addressed by bare tmdbId, movies by a title-and-id slug —
  // same split as CinemaRecordCard's own href.
  const detailsHref =
    type === "series" ? `/series/${(record as Series).tmdbId}` : `/movies/${getMovieSlug(record as Movie)}`;
  const genreBase = type === "series" ? "/series/genres" : "/movies/genres";
  const genreList = record.genres
    ? record.genres
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean)
    : [];

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label={t("hero.trailers")}
      // Swipe left/right anywhere on the hero — except on the rail, which
      // scrolls sideways itself.
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStartRef.current = (event.target as HTMLElement).closest("[data-hero-rail]")
          ? null
          : { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) goToNext();
        else goToPrevious();
      }}
      className="bg-grain relative isolate h-[calc(85vh-4rem)] min-h-[560px] w-full overflow-hidden bg-black sm:h-[calc(100dvh-4rem)]"
    >
      <HeroBackground
        key={record.id}
        record={record}
        muted={muted}
        volume={volume}
        onEnded={goToNext}
        onReady={() => setIsVideoReady(true)}
        onProgress={setProgress}
      />

      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/10 to-transparent sm:bg-linear-to-t sm:from-black/85 sm:via-black/10 sm:to-transparent" />

      <div className="absolute inset-x-0 bottom-[10.5rem] z-20 px-4 sm:bottom-[13rem] sm:px-8 lg:bottom-[14.5rem] lg:px-16">
        {/* Keyed per title so the details lift into place on every switch. */}
        <div key={record.id} className="animate-hero-content-in max-w-xl lg:max-w-2xl">
          <div>
            {record.logoURL ? (
              <div className="relative mb-3 h-16 w-[140px] sm:h-20 sm:w-[180px] lg:h-24 lg:w-[210px]">
                <Image
                  src={record.logoURL}
                  alt={record.title}
                  fill
                  priority
                  sizes="210px"
                  className="object-contain object-left"
                />
              </div>
            ) : (
              <h1 className="mb-3 text-3xl leading-[1.05] font-extrabold tracking-tighter text-white text-balance sm:text-5xl lg:text-6xl">
                {record.title}
              </h1>
            )}
          </div>

          {truncatedDescription && (
            <p className="mb-3 line-clamp-2 max-w-xl text-xs leading-relaxed font-medium text-white/70 sm:line-clamp-3 sm:text-base sm:text-white/80 lg:text-lg">
              {truncatedDescription}
            </p>
          )}

          {record.description && <p className="sr-only">{record.description}</p>}

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-white/75 sm:gap-4 sm:text-sm lg:text-base">
            {/* Which kind of title this is — the carousel mixes both, and
                without this the only hint is where the Watch button goes. */}
            <span className="rounded-md bg-white/15 px-2 py-1 text-white">
              {type === "series" ? t("hero.badgeSeries") : t("hero.badgeMovie")}
            </span>
            {genreList.map((genre) => (
              <Link
                key={genre}
                href={`${genreBase}/${encodeURIComponent(genre)}`}
                className="rounded-md bg-black/65 px-2 py-1 hover:bg-black/85 hover:text-white"
              >
                {genre}
              </Link>
            ))}
            {record.releaseDate && <span className="rounded-md bg-black/65 px-2 py-1">{record.releaseDate}</span>}
            <span className="rounded-md bg-black/65 px-2 py-1">4K</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href={detailsHref}
              className="rounded-xl border border-white/25 bg-white/90 px-4 py-2.5 text-sm font-semibold tracking-wide text-black shadow-[0_6px_20px_rgba(255,255,255,0.17)] sm:px-6 sm:py-3 sm:text-base"
            >
              {t("hero.watchNow")}
            </Link>

            {/* Same two buttons as the details page, so a title can be saved
                or liked without opening it first. They key off record.id,
                which for a trending row is the catalog record's own id (see
                the trending services' saveTrending* — a row only exists once
                the catalog has the title), so state stays in sync with the
                details page and /watchlist. */}
            <div className="flex items-center gap-2 self-center [&>*]:mt-0 [&>*]:self-center">
              <AddToWatchlistButton record={record} type={type} />
              <LikeButton record={record} type={type} />
            </div>

            <RatingRing value={record.tmdbRating} className="border-2 border-white/55" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-8 sm:pb-6 lg:px-16 lg:pb-8">
        <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={goToPrevious}
              aria-label={t("hero.previous")}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black sm:h-10 sm:w-10"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="shrink-0 text-sm font-semibold text-white tabular-nums" aria-live="polite">
              {String(currentIndex + 1).padStart(2, "0")}
              <span className="text-white/40"> / {String(items.length).padStart(2, "0")}</span>
            </p>
            <button
              type="button"
              onClick={goToNext}
              aria-label={t("hero.next")}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black sm:h-10 sm:w-10"
            >
              <ChevronRight size={18} />
            </button>
            {items.length > 1 && (
              <p className="hidden min-w-0 truncate text-sm text-white/55 md:block">
                {t("hero.upNext")}:{" "}
                <span className="font-semibold text-white/85">{items[(currentIndex + 1) % items.length].record.title}</span>
              </p>
            )}
          </div>

          <VolumeControl
            muted={muted}
            volume={volume}
            disabled={!isVideoReady}
            onMutedChange={changeMuted}
            onVolumeChange={changeVolume}
          />
        </div>

        <div data-hero-rail>
          <TrailerRail items={items} currentIndex={currentIndex} progress={progress} onSelect={(index) => goTo(() => index)} />
        </div>
      </div>
    </section>
  );
}
