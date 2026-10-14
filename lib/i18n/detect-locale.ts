import { isLocale, type Locale } from "./dictionary";

/**
 * Visitor country (ISO 3166 code, from Cloudflare's CF-IPCountry header) →
 * UI language. Every other country gets English.
 */
const COUNTRY_LOCALES: Record<string, Locale> = {
  BG: "bg",
  GR: "el",
  CY: "el",
  // Spain and the Spanish-speaking Americas / Equatorial Guinea.
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  BO: "es",
  DO: "es",
  HN: "es",
  PY: "es",
  SV: "es",
  NI: "es",
  CR: "es",
  PA: "es",
  UY: "es",
  PR: "es",
  GQ: "es",
};

/**
 * Search engines and link previews. They crawl from US/other IPs, but the
 * Bulgarian pages are the ones meant to be indexed (lib/seo.ts metadata is
 * Bulgarian), so they always get Bulgarian.
 */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|discord|preview|lighthouse/i;

/** Accept-Language's primary tags in order of preference, e.g. ["bg", "en"]. */
function acceptedLanguages(acceptLanguage: string): string[] {
  return acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase().split("-")[0])
    .filter(Boolean);
}

/**
 * The language a request should be rendered in:
 * 1. the visitor's saved choice (cookie) — always wins;
 * 2. crawlers → Bulgarian;
 * 3. the IP's country (Bulgaria → bg, Greece/Cyprus → el, Spanish-speaking
 *    countries → es, anywhere else → en);
 * 4. no country known (local dev, no Cloudflare in front) → the browser's
 *    Accept-Language, else Bulgarian.
 * The client then saves whatever was picked as the cookie (LocaleProvider),
 * so the language stays put on later visits, even from another country.
 */
export function detectLocale({
  savedLocale,
  userAgent,
  country,
  acceptLanguage,
}: {
  savedLocale: string | undefined;
  userAgent: string | null;
  country: string | null;
  acceptLanguage: string | null;
}): Locale {
  if (isLocale(savedLocale)) return savedLocale;
  if (userAgent && BOT_RE.test(userAgent)) return "bg";

  // "XX" = unknown, "T1" = Tor.
  const code = country?.toUpperCase();
  if (code && code !== "XX" && code !== "T1") return COUNTRY_LOCALES[code] ?? "en";

  for (const language of acceptedLanguages(acceptLanguage ?? "")) {
    if (language === "bg") return "bg";
    if (language === "el") return "el";
    if (language === "es") return "es";
    if (language === "en") return "en";
  }
  return "bg";
}
