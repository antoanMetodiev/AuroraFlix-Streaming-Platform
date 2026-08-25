"use client";

import { CinemaRecordCard } from "@/components/movies/cinema-record-card";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export function CinemaRecordGrid({ records, type }: { records: (Movie | Series)[]; type: "movie" | "series" }) {
  const { t } = useTranslation();

  if (records.length === 0) {
    return (
      <div className="relative flex min-h-[24em] flex-col items-center justify-center gap-2 text-center">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{t("common.noResults")}</h3>
        <p className="text-sm text-foreground/50">{t("common.noResultsDesc")}</p>
      </div>
    );
  }

  return (
    <section className="mx-auto grid max-w-[100rem] grid-cols-2 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 sm:px-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {records.map((record) => (
        <CinemaRecordCard key={record.id} record={record} type={type} />
      ))}
    </section>
  );
}
