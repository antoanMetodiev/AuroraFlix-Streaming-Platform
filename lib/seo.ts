/**
 * Everything search engines read about the site, in one place.
 *
 * The audience is Bulgarian, so every title/description/keyword here is
 * Bulgarian first — the same on both UI languages, since there's only one
 * URL per page and Google indexes that one version (the one Googlebot gets,
 * which is "bg": see resolveInitialLocale in app/layout.tsx).
 *
 * The phrases are what Bulgarians actually type when looking for a place to
 * watch: Cyrillic ("онлайн филми", "филми с бг субтитри") as well as the
 * Latin transliterations ("filmi online", "gledai filmi") that are just as
 * common. Google ignores <meta name="keywords"> for ranking — what counts
 * is these phrases appearing in titles, headings, descriptions and visible
 * text, which is where the rest of this file feeds them.
 */

import type { Metadata } from "next";
import { tmdbImage } from "@/lib/tmdb";

export const SITE_URL =process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SITE_NAME = "AuroraFlix";

export const HOME_TITLE = "Онлайн филми и сериали с БГ субтитри — гледай безплатно | AuroraFlix";
export const HOME_DESCRIPTION =
  "Гледай онлайн филми и сериали с БГ субтитри безплатно в HD и 4K. Нови филми 2026, екшън, комедии, филми на ужасите, анимации и хитови сериали — без регистрация, на AuroraFlix.";

export const SITE_KEYWORDS = [
  "онлайн филми",
  "филми онлайн",
  "гледай филми онлайн",
  "гледай филми",
  "гледане на филми онлайн",
  "безплатни филми",
  "филми онлайн безплатно",
  "филми с бг субтитри",
  "филми с български субтитри",
  "бг субтитри",
  "нови филми",
  "нови филми 2026",
  "филми 2026",
  "онлайн сериали",
  "сериали онлайн",
  "гледай сериали онлайн",
  "сериали с бг субтитри",
  "нови сериали",
  "HD филми",
  "4K филми",
  "екшън филми",
  "филми на ужасите",
  "комедии",
  "анимационни филми",
  "filmi online",
  "onlain filmi",
  "gledai filmi",
  "filmi bg subs",
  "filmi s bg subtitri",
  "seriali online",
  "gledai seriali",
  "AuroraFlix",
];

/** Genre listing headings, by the English genre name used in the URL. */
export const GENRE_SEO: Record<string, { movies: string; series: string }> = {
  Action: { movies: "Екшън филми", series: "Екшън сериали" },
  Horror: { movies: "Филми на ужасите", series: "Сериали на ужасите" },
  Comedy: { movies: "Комедии", series: "Комедийни сериали" },
  Drama: { movies: "Драми", series: "Драматични сериали" },
  Mystery: { movies: "Мистерии", series: "Мистериозни сериали" },
  Romance: { movies: "Романтични филми", series: "Романтични сериали" },
  Adventure: { movies: "Приключенски филми", series: "Приключенски сериали" },
  Crime: { movies: "Криминални филми", series: "Криминални сериали" },
  Fantasy: { movies: "Фентъзи филми", series: "Фентъзи сериали" },
  Historical: { movies: "Исторически филми", series: "Исторически сериали" },
  Animation: { movies: "Анимационни филми", series: "Анимационни сериали" },
  Thriller: { movies: "Трилъри", series: "Трилър сериали" },
  Western: { movies: "Уестърни", series: "Уестърн сериали" },
  Biography: { movies: "Биографични филми", series: "Биографични сериали" },
  Documentary: { movies: "Документални филми", series: "Документални сериали" },
  Family: { movies: "Семейни филми", series: "Семейни сериали" },
  Musical: { movies: "Мюзикъли", series: "Музикални сериали" },
  Sports: { movies: "Спортни филми", series: "Спортни сериали" },
  War: { movies: "Военни филми", series: "Военни сериали" },
};

export function genreHeading(genre: string, type: "movie" | "series"): string {
  const entry = GENRE_SEO[genre];
  if (entry) return type === "movie" ? entry.movies : entry.series;
  return `${genre} ${type === "movie" ? "филми" : "сериали"}`;
}

export function releaseYear(releaseDate?: string | null): string | undefined {
  const year = releaseDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : undefined;
}

/** A movie's / series' <title>, without the " | AuroraFlix" template suffix. */
export function recordTitle(title: string, releaseDate: string | null | undefined, type: "movie" | "series"): string {
  const year = releaseYear(releaseDate);
  const name = year ? `${title} (${year})` : title;
  return type === "movie"
    ? `${name} — гледай онлайн с БГ субтитри`
    : `${name} — гледай сериала онлайн с БГ субтитри`;
}

export function recordDescription(
  title: string,
  releaseDate: string | null | undefined,
  description: string | null | undefined,
  type: "movie" | "series"
): string {
  const year = releaseYear(releaseDate);
  const name = year ? `${title} (${year})` : title;
  const lead =
    type === "movie"
      ? `Гледай ${name} онлайн с БГ субтитри безплатно в HD.`
      : `Гледай сериала ${name} онлайн — всички сезони и епизоди с БГ субтитри безплатно.`;
  const summary = description?.trim();
  if (!summary) return lead;
  const room = 300 - lead.length - 1;
  return `${lead} ${summary.length > room ? `${summary.slice(0, room - 1).trimEnd()}…` : summary}`;
}

/**
 * The genres string the backend returns ("Action, Drama" or similar) as a
 * list for schema.org.
 */
export function genreList(genres?: string | null): string[] | undefined {
  const list = genres
    ?.split(/[,|/]/)
    .map((genre) => genre.trim())
    .filter(Boolean);
  return list && list.length > 0 ? list : undefined;
}

/**
 * generateMetadata for a catalog listing (/movies, /series and their genre
 * pages). Pages 2+ keep their own canonical; any other filter (year, actor,
 * sort, ?genre=) is just a re-slice of the same catalog, so those stay
 * crawlable for their links but out of the index.
 */
export function listingMetadata({
  type,
  genre,
  page,
  filtered,
}: {
  type: "movie" | "series";
  genre?: string;
  page?: string;
  filtered: boolean;
}): Metadata {
  const pageNumber = Number(page) > 1 ? Number(page) : 1;
  const basePath = genre
    ? `/${type === "movie" ? "movies" : "series"}/genres/${encodeURIComponent(genre)}`
    : `/${type === "movie" ? "movies" : "series"}`;
  const canonical = pageNumber > 1 ? `${basePath}?page=${pageNumber}` : basePath;

  const heading = genre
    ? genreHeading(genre, type)
    : type === "movie"
      ? "Онлайн филми"
      : "Онлайн сериали";
  const pageSuffix = pageNumber > 1 ? ` — страница ${pageNumber}` : "";

  const title = genre
    ? `${heading} онлайн с БГ субтитри${pageSuffix}`
    : type === "movie"
      ? `Онлайн филми — гледай филми онлайн с БГ субтитри${pageSuffix}`
      : `Онлайн сериали — гледай сериали онлайн с БГ субтитри${pageSuffix}`;

  const description = genre
    ? `${heading} онлайн безплатно с БГ субтитри в HD — нови и най-гледани заглавия, всеки ден обновявани, на ${SITE_NAME}.`
    : type === "movie"
      ? `Гледай онлайн филми безплатно с БГ субтитри в HD и 4K — нови филми 2026, екшън, комедии, ужаси, анимации и още хиляди заглавия на ${SITE_NAME}.`
      : `Гледай онлайн сериали безплатно с БГ субтитри — всички сезони и епизоди, нови сериали 2026 и любими хитове на ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { locale: "bg_BG", url: canonical, title, description },
  };
}

type SeoRecord = {
  title: string;
  description?: string | null;
  releaseDate?: string | null;
  genres?: string | null;
  tmdbRating?: string | null;
  posterImgURL?: string | null;
  backgroundImg_URL?: string | null;
  trailerURL?: string | null;
  castList?: { nameInRealLife?: string | null }[];
  allEpisodes?: { season?: string | null }[];
};

/** generateMetadata for a movie / series details page; `path` is its URL path. */
export function recordMetadata(record: SeoRecord, type: "movie" | "series", path: string): Metadata {
  const title = recordTitle(record.title, record.releaseDate, type);
  const description = recordDescription(record.title, record.releaseDate, record.description, type);
  const backdrop = tmdbImage(record.backgroundImg_URL ?? record.posterImgURL, "w1280");

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: type === "movie" ? "video.movie" : "video.tv_show",
      locale: "bg_BG",
      url: path,
      title,
      description,
      images: backdrop ? [{ url: backdrop }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: backdrop ? [backdrop] : undefined,
    },
  };
}

/**
 * schema.org Movie / TVSeries — lets Google show the poster, year and
 * rating next to the result.
 */
export function recordJsonLd(record: SeoRecord, type: "movie" | "series", path: string) {
  const actors = (record.castList ?? [])
    .map((actor) => actor.nameInRealLife?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 10);
  const seasons = new Set(
    (record.allEpisodes ?? []).map((episode) => episode.season).filter((season) => season != null)
  );

  return {
    "@context": "https://schema.org",
    "@type": type === "movie" ? "Movie" : "TVSeries",
    name: record.title,
    url: `${SITE_URL}${path}`,
    description: record.description ?? undefined,
    image: tmdbImage(record.posterImgURL, "w500") ?? undefined,
    datePublished: record.releaseDate || undefined,
    genre: genreList(record.genres),
    inLanguage: "en",
    subtitleLanguage: "bg",
    actor: actors.length > 0 ? actors.map((name) => ({ "@type": "Person", name })) : undefined,
    numberOfSeasons: type === "series" && seasons.size > 0 ? seasons.size : undefined,
    numberOfEpisodes: type === "series" && record.allEpisodes?.length ? record.allEpisodes.length : undefined,
    trailer: record.trailerURL
      ? { "@type": "VideoObject", name: `${record.title} — трейлър`, embedUrl: record.trailerURL }
      : undefined,
    // No aggregateRating: tmdbRating is TMDB's score, not one our own users
    // gave, and Google treats rating markup without real ratings behind it
    // as misleading structured data.
  };
}

/**
 * JSON-LD as the inner HTML of a <script type="application/ld+json"> —
 * `<` escaped so a title or description can never close the tag (see the
 * Next.js JSON-LD guide).
 */
export function jsonLdHtml(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
