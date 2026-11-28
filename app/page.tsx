import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { Reveal } from "@/components/ui/reveal";
import { HeroSection } from "@/components/home/hero-section";
import {
	// PAYMENTS DISABLED: LazyPricingSection, LazyCheckoutResultOverlay
	LazyContinueWatchingSection,
	LazyLastViewedSection,
	LazyTrendingSection,
	LazyTrendingShowcase,
} from "@/components/home/lazy-sections";
import type { TrendingShowcaseItem } from "@/components/home/trending-showcase";
import { getMovieSlug } from "@/lib/tmdb";
import { HomeBackdrop } from "@/components/home/home-backdrop";
import { RecapPill } from "@/components/recap/recap-pill";
import { SeasonalEffects } from "@/components/home/seasonal-effects";
import { SeasonalToggle } from "@/components/home/seasonal-toggle";
import { getTrendingMovies, getTrendingSeries } from "@/lib/api";
import { marqueeMovies, marqueeSeries } from "@/lib/data/home-marquee";
import type { HeroItem } from "@/components/home/hero-item";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Title/description come from the root layout's defaults (lib/seo.ts).
export const metadata: Metadata = {
	alternates: { canonical: "/" },
};

// How many of each kind the homepage uses (hero, showcase, backdrop). The
// trending endpoints return up to 10 each; only the top N are kept.
const HOME_MOVIES = 5;
const HOME_SERIES = 5;

// The endpoints list #1 last (see toShowcaseItems), so the top N are the
// last N entries — order is kept so the showcase's reverse() still works.
function topTrending<T>(records: T[], count: number): T[] {
	return records.slice(-count);
}

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

// Randomizes which title opens the hero carousel so the same one isn't
// always shown first on every visit.
function shuffle<T>(items: T[]): T[] {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Fetched in parallel — they hit two different downstream services, so
// awaiting them in sequence would stack two cold-start delays on Render's
// free tier. Promise.all is safe here because lib/api.ts's getJson never
// rejects (it returns null / an empty list on failure), so one service
// being down can't take the whole homepage with it. cache(): the hero and
// the showcase both read it, one fetch per request.
const loadTrending = cache(async (): Promise<[Movie[], Series[]]> => {
	const [movies, series] = await Promise.all([getTrendingMovies(), getTrendingSeries()]);
	return [topTrending(movies, HOME_MOVIES), topTrending(series, HOME_SERIES)];
});

/** Holds the hero's place (same size, same black) while trending streams in. */
function HeroSkeleton() {
	return (
		<section aria-hidden className="relative -mt-16 h-[85vh] min-h-[624px] w-full overflow-hidden bg-black sm:h-[100dvh]">
			<div className="absolute inset-0 animate-pulse bg-gradient-to-t from-black via-white/[0.02] to-white/[0.05]" />
		</section>
	);
}

async function TrendingHero() {
	const [movies, series] = await loadTrending();

	const heroItems = interleave(
		shuffle<Movie>(movies).map((record): HeroItem => ({ record, type: "movie" })),
		shuffle<Series>(series).map((record): HeroItem => ({ record, type: "series" }))
	);

	return <HeroSection items={heroItems} />;
}

async function TrendingShowcaseSection() {
	// Same trending data the hero already fetched — no extra requests.
	const [movies, series] = await loadTrending();
	return <LazyTrendingShowcase movies={toShowcaseItems(movies, "movie")} series={toShowcaseItems(series, "series")} />;
}

/**
 * Everything below the hero sits on the same blurred-poster background as
 * the Watchlist, instead of flat black — a random trending title, a new one
 * on every visit (see HomeBackdrop). Fixed behind the page, so the hero
 * simply covers it at the top.
 */
async function TrendingBackdrop() {
	const [movies, series] = await loadTrending();
	const posters = [...toShowcaseItems(movies, "movie"), ...toShowcaseItems(series, "series")].map((item) => item.posterURL);
	return <HomeBackdrop posters={posters} />;
}

export default function Home() {
	// Nothing awaited here: the header and page frame go out at once, and the
	// trending-backed sections stream in behind their own Suspense boundaries.
	return (
		<main className="flex-1">
			<Suspense fallback={null}>
				<TrendingBackdrop />
			</Suspense>

			{/* PAYMENTS DISABLED — nobody is charged for now; uncomment the
			    checkout overlay and the pricing section (and their imports).

			    useSearchParams (to read ?checkout=success&session_id=...) needs a
			    Suspense boundary here, or Next.js opts the whole route out of static
			    rendering.
			<Suspense fallback={null}>
				<LazyCheckoutResultOverlay />
			</Suspense>
			*/}

			<Suspense fallback={<HeroSkeleton />}>
				<TrendingHero />
			</Suspense>

			{/* Melts the hero's black bottom edge into the blurred background below it. */}
			<div aria-hidden className="pointer-events-none relative -z-[1] -mb-40 h-40 bg-gradient-to-b from-black to-transparent" />

			{/* PAYMENTS DISABLED: <LazyPricingSection /> */}

			{/* "Your week" in the middle; the seasonal effects switch on the right of the same row. */}
			<div className="mx-auto grid w-full max-w-[100rem] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-6 sm:px-6">
				<span aria-hidden />
				{/* A fixed middle slot, so the switch stays right even when there's no recap yet. */}
				<div className="flex justify-center">
					<RecapPill />
				</div>
				<div className="flex justify-end">
					<SeasonalToggle />
				</div>
			</div>

			<Reveal>
				<LazyContinueWatchingSection />
			</Reveal>

			<Reveal>
				<LazyLastViewedSection />
			</Reveal>

			{/* Streams in after the hero, behind its own boundary — never holds up the page. */}
			<Suspense fallback={null}>
				<TrendingShowcaseSection />
			</Suspense>

			<SeasonalEffects />

			<LazyTrendingSection movies={marqueeMovies} series={marqueeSeries} />


		</main>
	);
}
