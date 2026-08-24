import { Suspense } from "react";
import { HeroSection } from "@/components/home/hero-section";
import { LazyPricingSection, LazyLastViewedSection, LazyTrendingSection, LazyCheckoutResultOverlay } from "@/components/home/lazy-sections";
import { Footer } from "@/components/layout/footer";
import { getTrendingMovies } from "@/lib/api";
import { marqueeMovies, marqueeSeries } from "@/lib/data/home-marquee";
import type { Movie } from "@/types/movie";

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
	const trendingMovies = shuffle<Movie>(await getTrendingMovies());

	return (
		<main className="bg-black">
			{/* useSearchParams (to read ?checkout=success&session_id=...) needs a
			    Suspense boundary here, or Next.js opts the whole route out of static
			    rendering. */}
			<Suspense fallback={null}>
				<LazyCheckoutResultOverlay />
			</Suspense>

			<HeroSection movies={trendingMovies} />

			<LazyPricingSection />

			<LazyLastViewedSection />

			<LazyTrendingSection movies={marqueeMovies} series={marqueeSeries} />

			<Footer />
		</main>
	);
}
