import type { Locale } from "./dictionary";

/**
 * Every UI language, in the order the language picker lists them — for client
 * code, without importing dictionary.ts (all the English + Bulgarian copy).
 * Same list as dictionary.ts's LOCALES, which has to stay self-contained (the
 * mobile app's generator loads that file on its own) — keep the two in sync.
 */
export const LOCALES = ["bg", "en", "el", "es"] as const satisfies readonly Locale[];
