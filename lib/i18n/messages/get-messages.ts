import "server-only";
import { dictionary, GENRE_TRANSLATIONS, type Locale, type TranslationKey } from "../dictionary";
import { elGenres } from "../dictionary.el";
import { esGenres } from "../dictionary.es";
import { genreLabel, translate } from "../translate";
import type { Messages } from "./types";

// Every genre name any of the dictionaries translates.
const GENRES = [...new Set([...Object.keys(GENRE_TRANSLATIONS), ...Object.keys(elGenres), ...Object.keys(esGenres)])];

/** One language's copy, built on the server for the root layout to hand to LocaleProvider. */
export function getMessages(locale: Locale): Messages {
  const strings = {} as Record<TranslationKey, string>;
  for (const key of Object.keys(dictionary) as TranslationKey[]) strings[key] = translate(key, locale);
  const genres: Record<string, string> = {};
  for (const genre of GENRES) genres[genre] = genreLabel(genre, locale);
  return { strings, genres };
}
