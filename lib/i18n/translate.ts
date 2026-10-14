import { dictionary, GENRE_TRANSLATIONS, type Locale, type TranslationKey } from "./dictionary";
import { elDictionary, elGenres } from "./dictionary.el";
import { esDictionary, esGenres } from "./dictionary.es";

/** A UI string in the given language. */
export function translate(key: TranslationKey, locale: Locale): string {
  switch (locale) {
    case "el":
      return elDictionary[key];
    case "es":
      return esDictionary[key];
    default:
      return dictionary[key][locale];
  }
}

/** A genre name (the backend's English one, e.g. "Action") in the given language. */
export function genreLabel(genre: string, locale: Locale): string {
  switch (locale) {
    case "el":
      return elGenres[genre] ?? genre;
    case "es":
      return esGenres[genre] ?? genre;
    default:
      return GENRE_TRANSLATIONS[genre]?.[locale] ?? genre;
  }
}
