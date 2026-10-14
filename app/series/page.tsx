import type { Metadata } from "next";
import { CinemaRecordListPage } from "@/components/movies/cinema-record-list-page";
import type { SortOption } from "@/lib/api";
import { listingMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; year?: string; actor?: string; sort?: string; page?: string }>;
}): Promise<Metadata> {
  const { genre, year, actor, sort, page } = await searchParams;
  return listingMetadata({ type: "series", page, filtered: Boolean(genre || year || actor || sort) });
}

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
