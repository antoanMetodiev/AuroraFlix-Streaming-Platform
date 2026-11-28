import type { Metadata } from "next";
import { CinemaRecordListPage } from "@/components/movies/cinema-record-list-page";
import type { SortOption } from "@/lib/api";
import { listingMetadata } from "@/lib/seo";
import { isTopNetwork } from "@/lib/networks";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; year?: string; actor?: string; network?: string; sort?: string; page?: string }>;
}): Promise<Metadata> {
  const { genre, year, actor, network, sort, page } = await searchParams;
  return listingMetadata({ type: "series", page, filtered: Boolean(genre || year || actor || network || sort) });
}

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; year?: string; actor?: string; network?: string; sort?: string; page?: string; subs?: string }>;
}) {
  const { genre, year, actor, network, sort, page, subs } = await searchParams;
  return (
    <CinemaRecordListPage
      type="series"
      genre={genre}
      year={year}
      actor={actor}
      network={isTopNetwork(network) ? network : undefined}
      sort={sort as SortOption | undefined}
      page={Number(page) || 1}
      subs={subs === "machine" || subs === "provider" || subs === "cam" ? subs : undefined}
    />
  );
}
