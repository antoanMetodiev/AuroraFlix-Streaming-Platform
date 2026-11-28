"use client";

import { EmptyIllustration } from "@/components/ui/empty-illustration";
import Link from "next/link";
import { CinemaRecordCard } from "@/components/movies/cinema-record-card";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { useTranslation } from "@/lib/i18n/locale-context";
import { getMovieId } from "@/lib/tmdb";
import { useAdminSubtitleBadges } from "@/lib/use-admin";
import type { SeriesSourceCounts } from "@/lib/subtitle-source";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Caps how far the stagger stretches out on long pages — beyond this every
// card just animates together with the last one instead of the delay
// growing forever the further down the grid you go.
const MAX_STAGGERED = 24;
const STAGGER_STEP_MS = 45;
// One full row at the widest breakpoint (6 columns) loads right away; the
// rest load lazily as they near the screen.
const EAGER_POSTERS = 6;

export function CinemaRecordGrid({
  records,
  type,
  recordTypes,
  trendingRanks,
  adminSources,
}: {
  records: (Movie | Series)[];
  type: "movie" | "series";
  /** Per-record types for a mixed movies + series grid (same order as records); falls back to type. */
  recordTypes?: ("movie" | "series")[];
  /** Today's trending position by TMDB id (lib/trending-ranks.ts) — the "№3 днес" badge. */
  trendingRanks?: Record<string, number>;
  /** Admin list: the subtitle sources already known (else fetched for the admin). */
  adminSources?: Record<string, string | SeriesSourceCounts>;
}) {
  const { t } = useTranslation();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.05);
  const idOf = (record: Movie | Series, recordType: "movie" | "series") => (recordType === "movie" ? getMovieId(record) : (record.tmdbId ?? ""));
  // Admin only (nothing is fetched for anyone else): where each title's
  // subtitles came from. Single-type grids only — the ids are per service.
  const adminBadges = useAdminSubtitleBadges(type, recordTypes ? [] : records.map((record) => idOf(record, type)).filter(Boolean), adminSources);

  if (records.length === 0) {
    return (
      <div className="animate-card-in relative flex min-h-[24em] flex-col items-center justify-center gap-2 px-4 text-center">
        <EmptyIllustration kind="search" className="mb-2 h-32 w-44 sm:h-36 sm:w-48" />
        <h3 className="font-display text-3xl font-semibold tracking-tight text-foreground">{t("empty.resultsTitle")}</h3>
        <p className="max-w-sm text-sm text-foreground/55">{t("empty.resultsDesc")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href={type === "movie" ? "/movies" : "/series"}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t("empty.clearFilters")}
          </Link>
          <Link
            href="/order"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-foreground/85 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-neutral-900"
          >
            {t("empty.orderTitle")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={ref}
      className="mx-auto grid max-w-[100rem] grid-cols-2 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 sm:px-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      {records.map((record, index) => (
        <div
          key={`${recordTypes?.[index] ?? type}-${record.id}`}
          // relative + hover:z-40 (not just something inside this cell) is
          // required for the hover-preview panel to paint above cards in the
          // row below: animate-card-in animates opacity/transform, which per
          // spec makes this div its own stacking context for as long as the
          // animation is "in effect" (forever, since it fills forward) — any
          // z-index set on a descendant is trapped inside that context and
          // can never outrank a sibling cell's contents, no matter how high.
          className={`relative ${inView ? "animate-card-in" : "opacity-0"} hover:z-40`}
          style={inView ? { animationDelay: `${Math.min(index, MAX_STAGGERED) * STAGGER_STEP_MS}ms` } : undefined}
        >
          <CinemaRecordCard
            record={record}
            type={recordTypes?.[index] ?? type}
            eager={index < EAGER_POSTERS}
            trendingRank={trendingRanks?.[idOf(record, recordTypes?.[index] ?? type)]}
            adminBadge={adminBadges[idOf(record, recordTypes?.[index] ?? type)]}
          />
        </div>
      ))}
    </section>
  );
}
