import "server-only";
import { searchMovies, searchSeries, getMovieDetails, getSeriesDetails } from "@/lib/api";
import { getMovieId, getMovieSlug } from "@/lib/tmdb";
import { API_BASE_URL } from "@/lib/config";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export type MediaType = "movie" | "series";

/** A title the model named in its answer, by name — not tied to our catalog at all. */
export type NamedTitle = { mediaType: MediaType; title: string };

export type ResolvedCard = {
  mediaType: MediaType;
  id: string;
  title: string;
  slug: string;
  posterImgURL: string | null;
  tmdbRating: string | null;
  year: string | null;
  description: string | null;
  genres: string | null;
  images: string[];
};

// Extra gallery shots for the card — backdrops read better at the wide
// aspect ratio the card uses for them than more portrait posters would.
function galleryImages(record: Movie | Series, limit = 3): string[] {
  const backdrops = (record.imagesList ?? [])
    .filter((image) => image.imageType === "BACKDROP")
    .map((image) => image.imageURL);
  return backdrops.slice(0, limit);
}

export function toCard(record: Movie | Series, mediaType: MediaType): ResolvedCard {
  return {
    mediaType,
    id: mediaType === "movie" ? getMovieId(record as Movie) : (record as Series).tmdbId,
    title: record.title,
    slug: mediaType === "movie" ? getMovieSlug(record as Movie) : (record as Series).tmdbId,
    posterImgURL: record.posterImgURL ?? null,
    tmdbRating: record.tmdbRating ?? null,
    year: record.releaseDate?.split("-")[0] ?? null,
    description: record.description ?? null,
    genres: record.genres ?? null,
    images: galleryImages(record),
  };
}

type LibraryEntryResponse = {
  tmdbId: string | null;
  title: string | null;
  type: string | null;
};

async function fetchLibraryList(path: string, token: string): Promise<LibraryEntryResponse[]> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as LibraryEntryResponse[]) : [];
  } catch {
    return [];
  }
}

/**
 * Draws one Gemini API key at random from lumo-user-svc's own
 * ai_assistant_api_keys table (see internal/aiassistant there) — the pool
 * can hold any number of free-tier keys, and picking a different one per
 * request spreads chat traffic across all of them instead of being capped
 * by a single key's daily quota. Requires a signed-in caller, same as
 * likes/watchlist.
 */
export async function fetchRandomGeminiApiKey(authToken: string | null): Promise<string | null> {
  if (!authToken) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/ai-assistant/api-key`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { apiKey?: string };
    return data.apiKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Plain REST reads, not a model tool call — the assistant no longer needs a
 * Groq round-trip just to learn what the caller likes/saved, which used to
 * cost an extra request against the free tier's tight daily quota for every
 * single chat message.
 */
export async function fetchLibrarySummary(authToken: string | null): Promise<{ likes: string[]; watchlist: string[] }> {
  if (!authToken) return { likes: [], watchlist: [] };

  const [likes, watchlist] = await Promise.all([
    fetchLibraryList("/likes", authToken),
    fetchLibraryList("/watchlist", authToken),
  ]);

  const titles = (entries: LibraryEntryResponse[]) => entries.map((e) => e.title).filter((t): t is string => Boolean(t)).slice(0, 20);

  return { likes: titles(likes), watchlist: titles(watchlist) };
}

function normalize(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9а-я]+/gi, " ").trim();
}

// Exact (post-normalization) only — a substring/containment check let short
// or generic titles wrongly match longer, unrelated catalog entries (e.g.
// "Memento" matching "Memento Mori", "The Matrix" matching "The Matrix
// Resurrections"). A missed near-match just means no card gets attached,
// which is far safer than attaching the wrong movie's card.
function titlesMatch(query: string, candidate: string): boolean {
  return normalize(query) === normalize(candidate);
}

/**
 * The model names titles purely from its own general knowledge — it never
 * looks up or is limited to AuroraFlix's catalog while composing an answer
 * (see the system prompt). This is the only point where those names get
 * checked against the real catalog, purely to decide whether to attach a
 * clickable card — a title AuroraFlix doesn't have just gets no card, the
 * surrounding chat text is unaffected either way.
 */
export async function resolveNamedTitles(named: NamedTitle[]): Promise<ResolvedCard[]> {
  const unique = named.filter((n, index) => named.findIndex((o) => o.title === n.title) === index).slice(0, 10);

  const resolved = await Promise.all(
    unique.map(async ({ mediaType, title }) => {
      const [movies, series] = await Promise.all([searchMovies(title), searchSeries(title)]);
      const preferred = mediaType === "series" ? [...series, ...movies] : [...movies, ...series];
      const match = preferred.find((record) => titlesMatch(title, record.title));
      if (!match) return null;
      const matchedType: MediaType = series.includes(match as Series) ? "series" : "movie";

      // The search/list endpoint's record may not carry the full description
      // or image gallery the card needs — re-fetch by id from the same
      // details endpoint the actual title page uses, to be sure it does.
      const id = matchedType === "movie" ? getMovieId(match as Movie) : (match as Series).tmdbId;
      const full = matchedType === "movie" ? await getMovieDetails(id) : await getSeriesDetails(id);
      return toCard(full ?? match, matchedType);
    })
  );

  return resolved.filter((card, index, all): card is ResolvedCard => {
    if (!card) return false;
    return all.findIndex((c) => c && c.mediaType === card.mediaType && c.id === card.id) === index;
  });
}

