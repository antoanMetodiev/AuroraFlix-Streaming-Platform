// Bulgarian genre-page headings — split out of lib/seo.ts so client
// components (SeoIntro, ListPageHeading) can use them without pulling in
// lib/seo.ts and, through it, the whole English + Bulgarian dictionary.
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
