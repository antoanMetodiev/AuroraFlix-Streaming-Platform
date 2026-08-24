import { Suspense } from "react";
import { Footer } from "@/components/layout/footer";
import { DiscoverFilters } from "@/components/movies/discover-filters";
import { CinemaRecordGrid } from "@/components/movies/cinema-record-grid";
import { ListPageHeading } from "@/components/movies/list-page-heading";
import { PaginationControls } from "@/components/movies/pagination-controls";
import { Loader } from "@/components/ui/loader";
import {
  getMoviesDiscover,
  getMoviesDiscoverCount,
  getSeriesDiscover,
  getSeriesDiscoverCount,
  searchMovies,
  searchSeries,
  type SortOption,
} from "@/lib/api";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const PAGE_SIZE = 30;

export function CinemaRecordListPage({
  type,
  genre,
  year,
  actor,
  sort,
  searchTitle,
  page,
}: {
  type: "movie" | "series";
  genre?: string;
  year?: string;
  actor?: string;
  sort?: SortOption;
  searchTitle?: string;
  page: number;
}) {
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const listType = type === "movie" ? "movies" : "series";

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-x-hidden">
      {/*
       * flex-col so a short result set (few/no matches) still pins the footer
       * to the viewport bottom instead of leaving min-h-screen's slack trail
       * as dead space below it — the pre-footer content grows via flex-1 to
       * fill that slack instead.
       */}
      <article className="relative flex flex-1 flex-col">
        <div className="flex-1">
          {/* Title search stays its own separate, unfiltered flow — no discover filters shown there. */}
          {!searchTitle && <DiscoverFilters type={listType} genre={genre} year={year} actor={actor} sort={sort} />}

          {/*
           * Keyed by every param that changes the result set, so React treats a
           * filter/search/page change as a fresh subtree — the fallback below
           * shows again on each navigation instead of leaving stale results up.
           * The header and filters above are outside this boundary, so they
           * never disappear or flash — only the results area clears to a spinner.
           */}
          <Suspense
            key={`${type}-${genre ?? ""}-${year ?? ""}-${actor ?? ""}-${sort ?? ""}-${searchTitle ?? ""}-${currentPage}`}
            fallback={<Loader className="min-h-[40vh]" />}
          >
            <CinemaRecordResults type={type} genre={genre} year={year} actor={actor} sort={sort} searchTitle={searchTitle} page={currentPage} />
          </Suspense>
        </div>

        <Footer />
      </article>
    </div>
  );
}

async function CinemaRecordResults({
  type,
  genre,
  year,
  actor,
  sort,
  searchTitle,
  page,
}: {
  type: "movie" | "series";
  genre?: string;
  year?: string;
  actor?: string;
  sort?: SortOption;
  searchTitle?: string;
  page: number;
}) {
  let records: (Movie | Series)[];
  let totalPages: number;

  if (searchTitle) {
    // The search endpoint returns every match in one call, so pagination is
    // applied in-memory here instead of round-tripping to the backend again.
    const allMatches = type === "movie" ? await searchMovies(searchTitle) : await searchSeries(searchTitle);
    records = allMatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    totalPages = Math.max(1, Math.ceil(allMatches.length / PAGE_SIZE));
  } else {
    const filters = { genre, year, actor, sort };
    const [pageRecords, count] =
      type === "movie"
        ? await Promise.all([getMoviesDiscover(filters, page), getMoviesDiscoverCount(filters)])
        : await Promise.all([getSeriesDiscover(filters, page), getSeriesDiscoverCount(filters)]);
    records = pageRecords;
    totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  }

  const basePath = searchTitle
    ? `/${type === "movie" ? "movies" : "series"}/search/${encodeURIComponent(searchTitle)}`
    : `/${type === "movie" ? "movies" : "series"}`;

  const filterQuery = new URLSearchParams();
  if (!searchTitle) {
    if (genre) filterQuery.set("genre", genre);
    if (year) filterQuery.set("year", year);
    if (actor) filterQuery.set("actor", actor);
    if (sort && sort !== "newest") filterQuery.set("sort", sort);
  }

  return (
    <>
      <ListPageHeading type={type} genre={genre} searchTitle={searchTitle} />

      <CinemaRecordGrid records={records} type={type} />
      <PaginationControls currentPage={page} totalPages={totalPages} basePath={basePath} extraQuery={filterQuery.toString()} />
    </>
  );
}
