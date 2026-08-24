import type { Metadata } from "next";
import { CinemaRecordListPage } from "@/components/movies/cinema-record-list-page";
import type { SortOption } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre } = await params;
  const genreName = decodeURIComponent(genre);
  return {
    title: `${genreName} Movies`,
    description: `Browse ${genreName} movies on AuroraFlix.`,
  };
}

export default async function MoviesByGenrePage({
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
      type="movie"
      genre={decodeURIComponent(genre)}
      year={year}
      actor={actor}
      sort={sort as SortOption | undefined}
      page={Number(page) || 1}
    />
  );
}
