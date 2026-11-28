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
import { API_BASE_URL } from "@/lib/config";
import { tmdbImage } from "@/lib/tmdb";
import { parseGenres } from "@/lib/genres";
import { GENRE_TRANSLATIONS } from "@/lib/i18n/dictionary";

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

import { genreHeading } from "@/lib/genre-seo";
export { GENRE_SEO, genreHeading } from "@/lib/genre-seo";


export function releaseYear(releaseDate?: string | null): string | undefined {
  const year = releaseDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : undefined;
}

/** A movie's / series' <title>, without the " | AuroraFlix" template suffix. */
export function recordTitle(
  title: string,
  releaseDate: string | null | undefined,
  type: "movie" | "series",
  originalTitle?: string | null
): string {
  const year = releaseYear(releaseDate);
  // A translated title also carries the original, so both searches match:
  // "Генезис (Inception, 2010)".
  const extras = [originalTitle && originalTitle !== title ? originalTitle : null, year].filter(Boolean).join(", ");
  const name = extras ? `${title} (${extras})` : title;
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
 * list for schema.org — cleaned like the details header does it (some series
 * rows store `"Drama".`) and in Bulgarian, the language the page is indexed
 * in. A genre without a translation keeps its English name.
 */
export function genreList(genres?: string | null): string[] | undefined {
  const list = [...new Set(parseGenres(genres).map((genre) => GENRE_TRANSLATIONS[genre]?.bg ?? genre))];
  return list.length > 0 ? list : undefined;
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
  originalTitle?: string | null;
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
/**
 * The picture a shared link shows (Viber, Facebook, X…): drawn by the
 * gateway (lumo-api-gateway's internal/ogcard) — too heavy for this Worker's
 * free-plan CPU time. `id` is the one the details endpoint takes.
 */
export function shareImageUrl(type: "movie" | "series", id: string) {
  return `${API_BASE_URL}/og/${type}/${encodeURIComponent(id)}.jpg`;
}

export function recordMetadata(record: SeoRecord, type: "movie" | "series", path: string, id: string): Metadata {
  const title = recordTitle(record.title, record.releaseDate, type, record.originalTitle);
  const description = recordDescription(record.title, record.releaseDate, record.description, type);
  const image = { url: shareImageUrl(type, id), width: 1200, height: 630, alt: title, type: "image/jpeg" };

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
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
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
    alternateName: record.originalTitle && record.originalTitle !== record.title ? record.originalTitle : undefined,
    url: `${SITE_URL}${path}`,
    description: record.description ?? undefined,
    image: tmdbImage(record.posterImgURL, "w500") ?? undefined,
    datePublished: record.releaseDate || undefined,
    genre: genreList(record.genres),
    // No inLanguage: it was hard-coded "en", wrong for every French, Korean,
    // Turkish… title, and the record doesn't carry its original language.
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

type SeoActor = {
  nameInRealLife: string;
  originalName?: string | null;
  biography?: string | null;
  imageURL?: string | null;
  birthday?: string | null;
  placeOfBirth?: string | null;
  imdbId?: string | null;
  instagramUsername?: string | null;
  twitterUsername?: string | null;
  facebookUsername?: string | null;
};
type SeoWork = { title?: string | null; TYPE?: string | null };

/**
 * Whether an actor page is worth indexing: one with a single title and no
 * biography is near-empty, and thousands of those would only drag the rest
 * of the site down ("crawled — not indexed"). Those stay `noindex, follow`.
 */
export function actorIsIndexable(actor: SeoActor, works: SeoWork[]): boolean {
  return works.length >= 2 || (works.length >= 1 && Boolean(actor.biography?.trim()));
}

/** "Том Рийс Харис (Tom Rhys Harries)" — both spellings, so either search matches. */
function actorDisplayName(actor: SeoActor): string {
  const name = actor.nameInRealLife.trim();
  const original = actor.originalName?.trim();
  return original && original !== name ? `${name} (${original})` : name;
}

/** generateMetadata for /actors/{imdbId}. */
export function actorMetadata(actor: SeoActor, works: SeoWork[], path: string): Metadata {
  const name = actorDisplayName(actor);
  const title = `${name} — филми и сериали онлайн с БГ субтитри`;
  const titles = works
    .map((work) => work.title?.trim())
    .filter((workTitle): workTitle is string => Boolean(workTitle))
    .slice(0, 4);
  const lead = `Гледай филми и сериали с ${actor.nameInRealLife.trim()} онлайн с БГ субтитри безплатно${
    titles.length > 0 ? `: ${titles.join(", ")}` : ""
  }.`;
  const bio = actor.biography?.trim();
  const room = 300 - lead.length - 1;
  const description = bio && room > 40 ? `${lead} ${bio.length > room ? `${bio.slice(0, room - 1).trimEnd()}…` : bio}` : lead;
  const image = tmdbImage(actor.imageURL, "w500");

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: actorIsIndexable(actor, works) ? undefined : { index: false, follow: true },
    openGraph: {
      type: "profile",
      locale: "bg_BG",
      url: path,
      title,
      description,
      images: image ? [{ url: image, alt: actor.nameInRealLife }] : undefined,
    },
    twitter: { card: "summary", title, description, images: image ? [image] : undefined },
  };
}

/** schema.org Person for /actors/{imdbId}. */
export function actorJsonLd(actor: SeoActor, path: string) {
  const sameAs = [
    actor.imdbId ? `https://www.imdb.com/name/${actor.imdbId}/` : null,
    actor.instagramUsername ? `https://www.instagram.com/${actor.instagramUsername}` : null,
    actor.twitterUsername ? `https://x.com/${actor.twitterUsername}` : null,
    actor.facebookUsername ? `https://www.facebook.com/${actor.facebookUsername}` : null,
  ].filter((url): url is string => url !== null);
  const original = actor.originalName?.trim();

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: actor.nameInRealLife.trim(),
    alternateName: original && original !== actor.nameInRealLife.trim() ? original : undefined,
    url: `${SITE_URL}${path}`,
    image: tmdbImage(actor.imageURL, "w500") ?? undefined,
    description: actor.biography?.trim() || undefined,
    birthDate: actor.birthday && /^\d{4}-\d{2}-\d{2}$/.test(actor.birthday) ? actor.birthday : undefined,
    birthPlace: actor.placeOfBirth?.trim() ? { "@type": "Place", name: actor.placeOfBirth.trim() } : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
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
