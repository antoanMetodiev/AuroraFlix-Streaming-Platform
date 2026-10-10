import { Suspense } from "react";
import { HeroSection } from "@/components/home/hero-section";
import {
	LazyPricingSection,
	LazyLastViewedSection,
	LazyTrendingSection,
	LazyTrendingShowcase,
	LazyCheckoutResultOverlay,
} from "@/components/home/lazy-sections";
import type { TrendingShowcaseItem } from "@/components/home/trending-showcase";
import { getMovieSlug } from "@/lib/tmdb";
import { Footer } from "@/components/layout/footer";
import { PopularSection } from "@/components/home/popular-section";
import { getTrendingMovies, getTrendingSeries } from "@/lib/api";
import { marqueeMovies, marqueeSeries } from "@/lib/data/home-marquee";
import type { HeroItem } from "@/components/home/hero-item";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// How many of each kind the hero carousel shows. The trending endpoints
// return up to 10 each; this is the slice actually put in front of the user.
const HERO_MOVIES = 10;
const HERO_SERIES = 10;

/**
 * The trending endpoints list newest-inserted first (ORDER BY created_at
 * DESC), and the generators insert in TMDB's trending order — so the list
 * comes back with #1 last. Flipped here so the showcase can number them.
 */
function toShowcaseItems(records: (Movie | Series)[], type: "movie" | "series"): TrendingShowcaseItem[] {
	return [...records]
		.reverse()
		.filter((record) => record.posterImgURL)
		.map((record, index) => ({
			key: `${type}-${record.tmdbId ?? (record as Movie).movieId ?? index}`,
			title: record.title,
			posterURL: record.posterImgURL ?? "",
			rating: record.tmdbRating,
			year: record.releaseDate?.slice(0, 4),
			href: type === "series" ? `/series/${(record as Series).tmdbId}` : `/movies/${getMovieSlug(record as Movie)}`,
		}));
}

/**
 * Interleaves movies and series (movie, series, movie, series, ...) so the
 * carousel alternates instead of showing six of one and then six of the
 * other. Whichever list runs out first, the rest of the other is appended —
 * a shortfall on one side (a thin trending table, a downstream service
 * down) just means fewer entries, never a gap or a crash.
 */
function interleave(movies: HeroItem[], series: HeroItem[]): HeroItem[] {
	const mixed: HeroItem[] = [];
	for (let i = 0; i < Math.max(movies.length, series.length); i++) {
		if (movies[i]) mixed.push(movies[i]);
		if (series[i]) mixed.push(series[i]);
	}
	return mixed;
}

// Randomizes which trailer opens the hero carousel so the same title isn't
// always shown first on every visit.
function shuffle<T>(items: T[]): T[] {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export default async function Home() {
	// Fetched in parallel — they hit two different downstream services, so
	// awaiting them in sequence would stack two cold-start delays on Render's
	// free tier. Promise.all is safe here because lib/api.ts's getJson never
	// rejects (it returns null / an empty list on failure), so one service
	// being down can't take the whole homepage with it.
	const [movies, series] = await Promise.all([getTrendingMovies(), getTrendingSeries()]);

	const heroItems = interleave(
		shuffle<Movie>(movies)
			.slice(0, HERO_MOVIES)
			.map((record): HeroItem => ({ record, type: "movie" })),
		shuffle<Series>(series)
			.slice(0, HERO_SERIES)
			.map((record): HeroItem => ({ record, type: "series" }))
	);

	return (
		<main className="bg-black">
			{/* useSearchParams (to read ?checkout=success&session_id=...) needs a
			    Suspense boundary here, or Next.js opts the whole route out of static
			    rendering. */}
			<Suspense fallback={null}>
				<LazyCheckoutResultOverlay />
			</Suspense>

			<HeroSection items={heroItems} />

			<LazyPricingSection />

			<LazyLastViewedSection />

			{/* Streams in after the hero — see PopularSection's doc comment. */}
			{/* Same trending data the hero already fetched — no extra requests. */}
			<LazyTrendingShowcase movies={toShowcaseItems(movies, "movie")} series={toShowcaseItems(series, "series")} />

			<Suspense fallback={null}>
				<PopularSection />
			</Suspense>

			<LazyTrendingSection movies={marqueeMovies} series={marqueeSeries} />

			<Footer />
		</main>
	);
}
