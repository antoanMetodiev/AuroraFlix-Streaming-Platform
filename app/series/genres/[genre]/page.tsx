import type { Metadata } from "next";
import { CinemaRecordListPage } from "@/components/movies/cinema-record-list-page";
import type { SortOption } from "@/lib/api";
import { listingMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ genre: string }>;
  searchParams: Promise<{ year?: string; actor?: string; sort?: string; page?: string }>;
}): Promise<Metadata> {
  const { genre } = await params;
  const { year, actor, sort, page } = await searchParams;
  return listingMetadata({
    type: "series",
    genre: decodeURIComponent(genre),
    page,
    filtered: Boolean(year || actor || sort),
  });
}

export default async function SeriesByGenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ genre: string }>;
  searchParams: Promise<{ year?: string; actor?: string; sort?: string; page?: string }>;
}) {
  const { genre } = await params;
  const { year, actor, sort, page } = await searchParams;
  return (
    <CinemaRecordListPage
      type="series"
      genre={decodeURIComponent(genre)}
      year={year}
      actor={actor}
      sort={sort as SortOption | undefined}
      page={Number(page) || 1}
    />
  );
}
