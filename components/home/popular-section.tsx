import { getMoviesDiscover, getSeriesDiscover } from "@/lib/api";
import { PopularCarousels } from "@/components/home/popular-carousels";
import type { WorkCardItem } from "@/components/media/work-carousel";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const POPULAR_COUNT = 12;

// "Popular" = the best TMDB-rated titles released in this window.
const WINDOW_MONTHS = 12;

// We only store TMDB's average, not its vote count, so a title rated by one
// or two people can sit at a perfect 10.0 above everything real. Anything
// this high is treated as that kind of noise and left out.
const MAX_TRUSTED_RATING = 9.5;

function toIsoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

/**
 * Picks the top POPULAR_COUNT from discover's top_rated lists. Discover only
 * filters by a single release year, so the current and previous year are
 * fetched and merged, then trimmed to the last WINDOW_MONTHS — in January
 * the current year alone would barely have anything.
 */
function pickPopular(records: (Movie | Series)[], type: "MOVIE" | "SERIES"): WorkCardItem[] {
	const now = new Date();
	const today = toIsoDate(now);
	const since = new Date(now);
	since.setUTCMonth(since.getUTCMonth() - WINDOW_MONTHS);
	const sinceDate = toIsoDate(since);

	const seen = new Set<string>();

	return records
		.filter((record) => {
			const rating = Number(record.tmdbRating);
			const released = record.releaseDate ?? "";
			return (
				record.tmdbId &&
				record.posterImgURL &&
				Number.isFinite(rating) &&
				rating > 0 &&
				rating < MAX_TRUSTED_RATING &&
				released >= sinceDate &&
				released <= today
			);
		})
		.sort((a, b) => Number(b.tmdbRating) - Number(a.tmdbRating))
		.filter((record) => {
			if (seen.has(record.tmdbId!)) return false;
			seen.add(record.tmdbId!);
			return true;
		})
		.slice(0, POPULAR_COUNT)
		.map((record) => ({
			key: record.tmdbId!,
			title: record.title,
			posterURL: record.posterImgURL ?? "",
			tmdbRating: record.tmdbRating,
			type,
			videoURL: record.videoURL,
			tmdbId: record.tmdbId,
		}));
}

/**
 * Server-rendered behind its own <Suspense> in app/page.tsx, so the four
 * discover calls never hold up the hero above it. lib/api.ts's getJson never
 * throws (a failing service just yields an empty list), and an empty list
 * renders nothing — no broken section if movies-svc or series-svc is down.
 */
export async function PopularSection() {
	const year = new Date().getUTCFullYear();
	const topRated = { sort: "top_rated" as const };

	const [moviesThisYear, moviesLastYear, seriesThisYear, seriesLastYear] = await Promise.all([
		getMoviesDiscover({ ...topRated, year: String(year) }, 1),
		getMoviesDiscover({ ...topRated, year: String(year - 1) }, 1),
		getSeriesDiscover({ ...topRated, year: String(year) }, 1),
		getSeriesDiscover({ ...topRated, year: String(year - 1) }, 1),
	]);

	return (
		<PopularCarousels
			movies={pickPopular([...moviesThisYear, ...moviesLastYear], "MOVIE")}
			series={pickPopular([...seriesThisYear, ...seriesLastYear], "SERIES")}
		/>
	);
}
