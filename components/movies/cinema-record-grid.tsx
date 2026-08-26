"use client";

import { CinemaRecordCard } from "@/components/movies/cinema-record-card";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Caps how far the stagger stretches out on long pages — beyond this every
// card just animates together with the last one instead of the delay
// growing forever the further down the grid you go.
const MAX_STAGGERED = 24;
const STAGGER_STEP_MS = 45;

export function CinemaRecordGrid({ records, type }: { records: (Movie | Series)[]; type: "movie" | "series" }) {
  const { t } = useTranslation();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.05);

  if (records.length === 0) {
    return (
      <div className="relative flex min-h-[24em] flex-col items-center justify-center gap-2 text-center">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{t("common.noResults")}</h3>
        <p className="text-sm text-foreground/50">{t("common.noResultsDesc")}</p>
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
          key={record.id}
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
          <CinemaRecordCard record={record} type={type} />
        </div>
      ))}
    </section>
  );
}
