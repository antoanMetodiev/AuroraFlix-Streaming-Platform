"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/dictionary";
import { genreLabel } from "@/lib/i18n/translate";
import { ALL_GENRES } from "@/lib/genres";
import { genreHeading } from "@/lib/seo";

/**
 * The homepage's only <h1> and its plain-text intro, just above the footer —
 * what tells Google, in words, that this is a place to watch movies and
 * series online with Bulgarian subtitles (the hero and carousels above are
 * all images). Bulgarian is what gets indexed (see app/layout.tsx); the
 * English version is only for visitors who picked English. Also links every
 * genre page, so they get crawled and pass on relevance. Greek and Spanish
 * visitors get their own copy (without the Bulgarian-subtitles pitch).
 */
const COPY = {
  bg: {
    title: "Онлайн филми и сериали с БГ субтитри",
    paragraphs: [
      "AuroraFlix е мястото да гледаш филми онлайн и сериали онлайн безплатно — в HD и 4K качество, с български субтитри и без регистрация. Всеки ден добавяме нови филми и нови епизоди, така че винаги има какво да пуснеш.",
      "Тук ще намериш нови филми 2026, най-гледаните холивудски заглавия, екшън филми, комедии, филми на ужасите, трилъри, анимационни филми за цялото семейство и хитови сериали с всички сезони и епизоди. За много от тях имаме собствени субтитри на български, които се зареждат директно в плейъра.",
      "Не намираш заглавието, което търсиш? Поръчай го и го добавяме в каталога.",
    ],
    moviesHeading: "Филми по жанрове",
    seriesHeading: "Сериали по жанрове",
  },
  en: {
    title: "Watch movies and series online",
    paragraphs: [
      "AuroraFlix is where you watch movies and series online for free — in HD and 4K, with Bulgarian subtitles and no sign-up needed. New movies and new episodes are added every day.",
      "Find the newest 2026 releases, Hollywood hits, action movies, comedies, horror, thrillers, animated movies for the whole family and hit series with every season and episode. Many of them come with our own Bulgarian subtitles, loaded straight into the player.",
      "Can't find a title? Order it and we'll add it to the catalog.",
    ],
    moviesHeading: "Movies by genre",
    seriesHeading: "Series by genre",
  },
  el: {
    title: "Δες ταινίες και σειρές online",
    paragraphs: [
      "Το AuroraFlix είναι το μέρος για να βλέπεις ταινίες και σειρές online δωρεάν — σε HD και 4K, χωρίς εγγραφή. Κάθε μέρα προσθέτουμε νέες ταινίες και νέα επεισόδια.",
      "Θα βρεις τις νέες κυκλοφορίες του 2026, χολιγουντιανές επιτυχίες, ταινίες δράσης, κωμωδίες, ταινίες τρόμου, θρίλερ, κινούμενα σχέδια για όλη την οικογένεια και δημοφιλείς σειρές με όλες τις σεζόν και τα επεισόδια.",
      "Δεν βρίσκεις έναν τίτλο; Παράγγειλέ τον και θα τον προσθέσουμε στον κατάλογο.",
    ],
    moviesHeading: "Ταινίες ανά είδος",
    seriesHeading: "Σειρές ανά είδος",
  },
  es: {
    title: "Ver películas y series online",
    paragraphs: [
      "AuroraFlix es el lugar para ver películas y series online gratis — en HD y 4K, sin registrarte. Cada día añadimos películas nuevas y nuevos episodios.",
      "Encontrarás los estrenos de 2026, éxitos de Hollywood, películas de acción, comedias, terror, suspense, animación para toda la familia y series de éxito con todas sus temporadas y episodios.",
      "¿No encuentras un título? Pídelo y lo añadimos al catálogo.",
    ],
    moviesHeading: "Películas por género",
    seriesHeading: "Series por género",
  },
} as const satisfies Record<Locale, { title: string; paragraphs: readonly string[]; moviesHeading: string; seriesHeading: string }>;

export function SeoIntro() {
  const { locale } = useLocale();
  const copy = COPY[locale];

  function genreLinkLabel(genre: string, type: "movie" | "series") {
    if (locale === "bg") return genreHeading(genre, type);
    if (locale === "en") return `${genreLabel(genre, locale)} ${type === "movie" ? "movies" : "series"}`;
    // Under a "Movies by genre" / "Series by genre" heading, the genre alone reads fine.
    return genreLabel(genre, locale);
  }

  return (
    <section className="relative z-10 bg-background px-6 pt-16 pb-4 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{copy.title}</h1>
        <div className="mt-4 flex max-w-4xl flex-col gap-3 text-sm leading-relaxed text-foreground/65 sm:text-base">
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {(["movie", "series"] as const).map((type) => (
            <nav key={type} aria-label={type === "movie" ? copy.moviesHeading : copy.seriesHeading}>
              <h2 className="text-sm font-semibold text-foreground/85">
                {type === "movie" ? copy.moviesHeading : copy.seriesHeading}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {ALL_GENRES.map((genre) => (
                  <li key={genre}>
                    <Link
                      href={`/${type === "movie" ? "movies" : "series"}/genres/${encodeURIComponent(genre)}`}
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:border-white/30 hover:text-foreground sm:text-sm"
                    >
                      {genreLinkLabel(genre, type)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </section>
  );
}
