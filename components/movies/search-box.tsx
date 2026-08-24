"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchMatchingMovies, searchMatchingSeries } from "@/lib/api-public";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { Spinner } from "@/components/ui/loader";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

type Suggestion = (Movie | Series) & { title: string; posterImgURL?: string | null; releaseDate?: string | null };

export function SearchBox({ type, onNavigate }: { type: "movie" | "series"; onNavigate?: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isNavigating, startNavigation] = useTransition();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!value.trim()) return;

    const timeout = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const results =
          type === "movie"
            ? await searchMatchingMovies(value, controller.signal)
            : await searchMatchingSeries(value, controller.signal);
        setSuggestions(results as Suggestion[]);
        setIsOpen(true);
        setIsSearching(false);
      } catch {
        // aborted or network error — ignore
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [value, type]);

  const goToDetails = (item: Suggestion) => {
    setIsOpen(false);
    const href = type === "series" ? `/series/${(item as Series).tmdbId}` : `/movies/${getMovieSlug(item as Movie)}`;
    startNavigation(() => router.push(href));
    onNavigate?.();
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const title = value.trim();
    if (!title) return;
    setIsOpen(false);
    startNavigation(() => router.push(`/${type === "movie" ? "movies" : "series"}/search/${encodeURIComponent(title)}`));
    onNavigate?.();
  };

  return (
    <div className="relative w-full max-w-[20rem] sm:max-w-[24rem]">
      <form onSubmit={submitSearch} className="group relative flex w-full items-center">
        {isNavigating || isSearching ? (
          <Spinner size={15} className="pointer-events-none absolute left-4 z-10 border-foreground/25 border-t-foreground/70" />
        ) : (
          <Search
            size={17}
            className="pointer-events-none absolute left-4 z-10 text-foreground/40 transition-colors duration-300 group-focus-within:text-foreground"
          />
        )}
        <input
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);
            if (nextValue.trim()) {
              setIsSearching(true);
            } else {
              setSuggestions([]);
              setIsSearching(false);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 250)}
          autoComplete="off"
          type="search"
          name="search"
          placeholder={type === "movie" ? t("search.placeholderMovies") : t("search.placeholderSeries")}
          className="w-full min-w-0 rounded-full border border-foreground/15 bg-foreground/[0.06] py-2.5 pr-4 pl-11 text-sm text-foreground placeholder:text-foreground/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-300 outline-none focus:border-transparent focus:bg-foreground/[0.1] focus:shadow-[0_0_0_1.5px_#8e2de2,0_8px_28px_-6px_rgba(142,45,226,0.55)] [&::-webkit-search-cancel-button]:appearance-none"
        />
      </form>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-20 mt-1.5 max-h-80 w-full max-w-[24rem] overflow-y-auto rounded-2xl border border-foreground/10 bg-surface py-2 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToDetails(item)}
              className="flex w-full items-start gap-3 border-b border-foreground/5 px-4 py-3 text-left transition hover:bg-foreground/8 last:border-none"
            >
              {item.posterImgURL && (
                <span className="relative h-[75px] w-[52px] shrink-0 overflow-hidden rounded-lg shadow-[0_2px_4px_rgba(255,255,255,0.2)]">
                  <FadeInImage
                    src={tmdbImage(item.posterImgURL, "w342") ?? ""}
                    alt=""
                    sizes="52px"
                    className="object-cover"
                  />
                </span>
              )}
              <span>
                <span className="block text-sm text-foreground">{item.title}</span>
                <span className="block text-xs text-foreground/65">{item.releaseDate}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
