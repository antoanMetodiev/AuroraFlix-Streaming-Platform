"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, Star } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { useTranslation } from "@/lib/i18n/locale-context";

export type TrendingShowcaseItem = {
  key: string;
  title: string;
  posterURL: string;
  rating: string;
  year?: string;
  href: string;
};

type RankedItem = TrendingShowcaseItem & { rank: number };

/**
 * The ranked list next to the columns: every title, in a box about five
 * rows tall that scrolls (scrollbar hidden). While there's more below, its
 * bottom edge fades out as the hint that it scrolls at all; at the end the
 * fade lifts so the last row isn't left half-hidden.
 */
function RankedList({ items }: { items: RankedItem[] }) {
  const [atEnd, setAtEnd] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const updateAtEnd = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setAtEnd(list.scrollTop + list.clientHeight >= list.scrollHeight - 4);
  }, []);

  // Also right away — a short list that doesn't overflow is "at the end"
  // from the start and needs no fade.
  useEffect(() => {
    updateAtEnd();
  }, [items, updateAtEnd]);

  return (
    <ol
      ref={listRef}
      onScroll={updateAtEnd}
      className={`scrollbar-none mt-8 max-h-[332px] space-y-1 overflow-y-auto ${atEnd ? "" : "edge-fade-bottom"}`}
    >
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className="group/row flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.06]"
          >
            <span className="w-8 shrink-0 text-2xl font-black text-white/25 tabular-nums transition-colors group-hover/row:text-sky-400">
              {item.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white sm:text-base">{item.title}</span>
              {item.year && <span className="text-xs text-white/45">{item.year}</span>}
            </span>
            {Number(item.rating) > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-white/60">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {Number(item.rating).toFixed(1)}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

/**
 * Column speeds, in seconds per loop — deliberately a little different from
 * each other so the columns drift against one another instead of moving in
 * lockstep.
 */
const COLUMN_DURATIONS_S = [46, 54, 50];

/**
 * Splits the titles round-robin into `count` columns (#1, #4, #7… in the
 * first), then repeats each column until it holds at least `minPerColumn`
 * cards, so even a short trending list fills the column's full height
 * before it loops.
 */
function toColumns(items: RankedItem[], count: number, minPerColumn: number): RankedItem[][] {
  const columns: RankedItem[][] = Array.from({ length: count }, () => []);
  items.forEach((item, index) => columns[index % count].push(item));

  return columns
    .filter((column) => column.length > 0)
    .map((column) => {
      const filled = [...column];
      while (filled.length < minPerColumn) filled.push(...column);
      return filled;
    });
}

function PosterCard({ item, hidden }: { item: RankedItem; hidden: boolean }) {
  const rating = Number(item.rating);

  return (
    <li aria-hidden={hidden}>
      <Link
        href={item.href}
        tabIndex={hidden ? -1 : 0}
        className="group/card relative block aspect-2/3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] transition-all duration-300 hover:border-white/30 hover:shadow-[0_18px_48px_-12px_rgba(255,255,255,0.25)]"
      >
        <Image
          src={tmdbImage(item.posterURL, "w342") ?? ""}
          alt={hidden ? "" : item.title}
          fill
          sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pt-12 pb-3">
          <p className="text-[10px] font-bold tracking-[0.18em] text-sky-400 uppercase">
            #{item.rank}
            {item.year && ` · ${item.year}`}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold text-white">{item.title}</p>
          {Number.isFinite(rating) && rating > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

/**
 * Endless vertical poster columns, alternating direction — up, down, up.
 * Each column's list is rendered twice back to back and slid by exactly
 * half its height (see .animate-marquee-up/-down in globals.css), so the
 * loop has no seam. Hovering anywhere over the columns pauses all of them.
 */
function PosterColumns({ columns }: { columns: RankedItem[][] }) {
  return (
    <div className="edge-fade-y group flex h-full gap-3 sm:gap-4">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="min-w-0 flex-1 overflow-hidden">
          <ul
            className={`flex flex-col gap-3 pb-3 group-hover:[animation-play-state:paused] sm:gap-4 sm:pb-4 ${
              columnIndex % 2 === 0 ? "animate-marquee-up" : "animate-marquee-down"
            }`}
            style={{ "--marquee-duration": `${COLUMN_DURATIONS_S[columnIndex % COLUMN_DURATIONS_S.length]}s` } as CSSProperties}
          >
            {[...column, ...column].map((item, index) => (
              // Only a title's first appearance is real; every repeat (the
              // fill-up and the whole second copy) is decoration, hidden from
              // screen readers and tab order.
              <PosterCard key={`${item.key}-${index}`} item={item} hidden={column.indexOf(item) !== index} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ShowcaseBlock({
  heading,
  text,
  items,
  flipped,
}: {
  heading: string;
  text: string;
  items: TrendingShowcaseItem[];
  flipped: boolean;
}) {
  const { t } = useTranslation();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.15);

  if (items.length === 0) return null;

  const ranked: RankedItem[] = items.map((item, index) => ({ ...item, rank: index + 1 }));

  return (
    <section
      ref={ref}
      aria-label={heading}
      className={`reveal relative overflow-hidden bg-background py-14 sm:py-20 ${inView ? "" : "reveal-hidden"}`}
    >
      {/* Soft glow behind the columns, on whichever side they sit. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-sky-500/10 blur-3xl ${
          flipped ? "left-0 lg:left-[8%]" : "right-0 lg:right-[8%]"
        }`}
      />

      <div
        className={`relative mx-auto grid max-w-[90rem] items-center gap-10 px-4 sm:px-6 lg:gap-16 lg:px-8 ${
          // Grid tracks follow visual order, so the wider track has to swap
          // sides along with the columns.
          flipped ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        }`}
      >
        <div className={flipped ? "lg:order-2" : ""}>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <Flame size={14} />
            {t("home.trendingEyebrow")}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">{heading}</h2>
          <p className="mt-3 max-w-md text-sm text-white/60 sm:text-base">{text}</p>

          <RankedList items={ranked} />
        </div>

        <div className={`h-[460px] sm:h-[560px] lg:h-[640px] ${flipped ? "lg:order-1" : ""}`}>
          {/* Two columns on phones, three from sm up — each split separately,
              so a phone still gets every title rather than losing a column. */}
          <div className="h-full sm:hidden">
            <PosterColumns columns={toColumns(ranked, 2, 4)} />
          </div>
          <div className="hidden h-full sm:block">
            <PosterColumns columns={toColumns(ranked, 3, 4)} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * "Trending Movies" / "Trending Series" — the same trending lists the hero
 * carousel plays trailers from, shown as moving poster columns with the
 * full ranked list beside them. The two blocks mirror each other (columns
 * right, then left) so they don't read as one repeated section.
 */
export function TrendingShowcase({ movies, series }: { movies: TrendingShowcaseItem[]; series: TrendingShowcaseItem[] }) {
  const { t } = useTranslation();

  return (
    <>
      <ShowcaseBlock heading={t("home.trendingMovies")} text={t("home.trendingMoviesText")} items={movies} flipped={false} />
      <ShowcaseBlock heading={t("home.trendingShows")} text={t("home.trendingShowsText")} items={series} flipped />
    </>
  );
}
