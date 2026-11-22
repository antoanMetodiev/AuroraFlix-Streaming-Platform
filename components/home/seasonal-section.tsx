import { WorkCarousel, type WorkCardItem } from "@/components/media/work-carousel";
import { SeasonalToggle } from "@/components/home/seasonal-toggle";
import { getMoviesDiscover, searchMovies, searchSeries } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { translate } from "@/lib/i18n/translate";
import { activeSeason, type Season } from "@/lib/seasons";
import { getMovieId } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const MAX_ITEMS = 20;

function movieItem(movie: Movie): WorkCardItem {
  return {
    key: `movie-${getMovieId(movie)}`,
    title: movie.title,
    originalTitle: movie.originalTitle,
    posterURL: movie.posterImgURL ?? "",
    tmdbRating: movie.tmdbRating,
    type: "MOVIE",
    tmdbId: getMovieId(movie),
    videoURL: movie.videoURL,
    releaseDate: movie.releaseDate,
  };
}

function seriesItem(series: Series): WorkCardItem {
  return {
    key: `series-${series.tmdbId}`,
    title: series.title,
    originalTitle: series.originalTitle,
    posterURL: series.posterImgURL ?? "",
    tmdbRating: series.tmdbRating,
    type: "SERIES",
    tmdbId: series.tmdbId,
    releaseDate: series.releaseDate,
  };
}

async function itemsFor(season: Season): Promise<WorkCardItem[]> {
  let items: WorkCardItem[];
  if (season === "winter") {
    const [movies, series] = await Promise.all([searchMovies("Christmas"), searchSeries("Christmas")]);
    items = [...movies.map(movieItem), ...series.map(seriesItem)];
  } else if (season === "halloween") {
    const [named, horror] = await Promise.all([searchMovies("Halloween"), getMoviesDiscover({ genre: "Horror", sort: "top_rated" }, 1)]);
    items = [...named, ...horror].map(movieItem);
  } else {
    items = (await getMoviesDiscover({ genre: "Romance", sort: "top_rated" }, 1)).map(movieItem);
  }
  const seen = new Set<string>();
  return items
    .filter((item) => item.posterURL && !seen.has(item.key) && seen.add(item.key))
    .sort((a, b) => (Number(b.tmdbRating) || 0) - (Number(a.tmdbRating) || 0))
    .slice(0, MAX_ITEMS);
}

/**
 * The season's themed row on the homepage (lib/seasons.ts), with the switch
 * for its particles. Renders nothing outside a season.
 */
export async function SeasonalSection({ override }: { override?: string | null }) {
  const season = activeSeason(new Date(), override);
  if (!season) return null;
  const [items, locale] = await Promise.all([itemsFor(season), getRequestLocale()]);
  if (items.length === 0) return null;

  return (
    <WorkCarousel
      items={items}
      mode="popular"
      heading={`${SEASON_EMOJI[season]} ${translate(`seasonal.${season}`, locale)}`}
      headingAside={<SeasonalToggle key="seasonal-toggle" />}
    />
  );
}

const SEASON_EMOJI: Record<Season, string> = { winter: "🎄", halloween: "🎃", valentine: "💘" };
