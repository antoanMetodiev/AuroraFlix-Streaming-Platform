import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { Locale } from "./dictionary";
import { detectLocale } from "./detect-locale";
import { LOCALE_COOKIE_NAME } from "./locale-cookie";

/**
 * The language of the request being rendered — the visitor's saved choice,
 * else by country (see detectLocale). Cached per request, so the root
 * layout, the pages' metadata and every API call (lib/api.ts asks the
 * backend for that language's titles and descriptions) agree on one value.
 */
export const getRequestLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return detectLocale({
    savedLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    userAgent: headerStore.get("user-agent"),
    country: headerStore.get("cf-ipcountry"),
    acceptLanguage: headerStore.get("accept-language"),
  });
});
