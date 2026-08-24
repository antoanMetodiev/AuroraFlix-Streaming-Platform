import type { Metadata } from "next";
import { CinemaRecordListPage } from "@/components/movies/cinema-record-list-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ title: string }>;
}): Promise<Metadata> {
  const { title } = await params;
  const query = decodeURIComponent(title);
  return {
    title: `“${query}” — Movie search`,
    robots: { index: false },
  };
}

export default async function MoviesSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ title: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { title } = await params;
  const { page } = await searchParams;
  return <CinemaRecordListPage type="movie" searchTitle={decodeURIComponent(title)} page={Number(page) || 1} />;
}
