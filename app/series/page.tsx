import type { Metadata } from "next";
import { CinemaRecordListPage } from "@/components/movies/cinema-record-list-page";
import type { SortOption } from "@/lib/api";

export const metadata: Metadata = {
  title: "Series",
  description: "Browse the full AuroraFlix series catalog — filter by genre, year, actor and search thousands of shows.",
};

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; year?: string; actor?: string; sort?: string; page?: string }>;
}) {
  const { genre, year, actor, sort, page } = await searchParams;
  return (
    <CinemaRecordListPage
      type="series"
      genre={genre}
      year={year}
      actor={actor}
      sort={sort as SortOption | undefined}
      page={Number(page) || 1}
    />
  );
}
