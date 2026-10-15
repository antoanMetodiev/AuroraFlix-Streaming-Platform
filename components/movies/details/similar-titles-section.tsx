import { Sparkles } from "lucide-react";
import { CinemaRecordGrid } from "@/components/movies/cinema-record-grid";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { getMoviesDiscover, getSeriesDiscover } from "@/lib/api";
import { parseGenres } from "@/lib/genres";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { translate } from "@/lib/i18n/translate";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

type RecordType = "movie" | "series";

// How many of each type the section shows (movies and series alternate).
const PER_TYPE = 6;

// Genres of the current title used to look for similar ones — the first are
// the most characteristic.
const MAX_GENRES = 2;

/**
 * "You may also like": movies and series sharing the current title's genres,
 * below the comments on every details page.
 *
 * Candidates are the top-rated titles of each of its first genres. Those
 * sharing more genres with it come first; among equals the order is
 * shuffled with the title's id as the seed, so each page shows its own mix
 * (not the same dozen hits everywhere) yet the same one on every visit.
 */
export async function SimilarTitlesSection({ record, type }: { record: Movie | Series; type: RecordType }) {
  const genres = parseGenres(record.genres).slice(0, MAX_GENRES);
  if (genres.length === 0) return null;

  const [movies, series, locale] = await Promise.all([
    candidates("movie", genres),
    candidates("series", genres),
    getRequestLocale(),
  ]);

  const exclude = (candidateType: RecordType) => (candidate: Movie | Series) =>
    !(candidateType === type && candidate.id === record.id);

  const random = seededRandom(record.id);
  const pickedMovies = mostSimilar(movies.filter(exclude("movie")), genres, random).slice(0, PER_TYPE);
  const pickedSeries = mostSimilar(series.filter(exclude("series")), genres, random).slice(0, PER_TYPE);

  const records: (Movie | Series)[] = [];
  const recordTypes: RecordType[] = [];
  for (let i = 0; i < PER_TYPE; i++) {
    if (pickedMovies[i]) {
      records.push(pickedMovies[i]);
      recordTypes.push("movie");
    }
    if (pickedSeries[i]) {
      records.push(pickedSeries[i]);
      recordTypes.push("series");
    }
  }
  if (records.length === 0) return null;

  return (
    <section className="mx-auto max-w-[100rem] pt-4 pb-16 sm:pb-24">
      <SectionHeading className="px-4 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <Sparkles size={20} className="text-foreground/60" />
          {translate("details.similarTitle", locale)}
        </span>
      </SectionHeading>
      <CinemaRecordGrid records={records} type={type} recordTypes={recordTypes} />
    </section>
  );
}

/** Top-rated titles of each genre, without duplicates; [] if the service fails. */
async function candidates(candidateType: RecordType, genres: string[]): Promise<(Movie | Series)[]> {
  const fetchPage = candidateType === "movie" ? getMoviesDiscover : getSeriesDiscover;
  const pages = await Promise.all(
    genres.map((genre) => fetchPage({ genre, sort: "top_rated" }, 1).catch(() => [] as (Movie | Series)[]))
  );

  const seen = new Set<string>();
  return pages.flat().filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}

/** Most shared genres first; ties in a seeded-random order. */
function mostSimilar(list: (Movie | Series)[], genres: string[], random: () => number): (Movie | Series)[] {
  const wanted = new Set(genres.map((genre) => genre.toLowerCase()));
  return list
    .map((candidate) => ({
      candidate,
      shared: parseGenres(candidate.genres).filter((genre) => wanted.has(genre.toLowerCase())).length,
      tieBreak: random(),
    }))
    .sort((a, b) => b.shared - a.shared || a.tieBreak - b.tieBreak)
    .map((entry) => entry.candidate);
}

/** A small deterministic PRNG (mulberry32) seeded by a string hash (FNV-1a). */
function seededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
