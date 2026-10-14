/**
 * The saved-language cookie. Its own plain module (not locale-context.tsx):
 * that file is "use client", and a constant imported from a client module
 * into a Server Component is a client reference, not the string — so the
 * root layout was silently never reading the visitor's saved choice.
 */
export const LOCALE_COOKIE_NAME = "auroraflix_locale";
