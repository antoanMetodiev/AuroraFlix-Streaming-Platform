import type { TranslationKey } from "../dictionary";

/**
 * One language's UI copy, flat — what the browser gets. The root layout builds
 * it on the server for the visitor's language (getMessages) and hands it to
 * LocaleProvider, so a page carries a single language instead of every
 * dictionary file (~140 KB of all four) in its JavaScript. Switching language
 * reloads the page (LocaleProvider.setLocale), so the browser never needs two
 * at once. No client module may import the dictionaries or ../translate.
 */
export type Messages = {
  strings: Record<TranslationKey, string>;
  /** Backend (English) genre name → this language's; missing ones stay English. */
  genres: Record<string, string>;
};
