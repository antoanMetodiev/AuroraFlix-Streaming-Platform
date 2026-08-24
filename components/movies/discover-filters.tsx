"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, User, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { ModernSelect } from "@/components/ui/modern-select";
import { Spinner } from "@/components/ui/loader";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { suggestActors } from "@/lib/api-public";
import { setPendingActor } from "@/lib/actor-session";
import { tmdbImage } from "@/lib/tmdb";
import { calculateAge } from "@/lib/dates";
import { ALL_GENRES } from "@/lib/genres";
import { useTranslation } from "@/lib/i18n/locale-context";
import { GENRE_TRANSLATIONS } from "@/lib/i18n/dictionary";
import type { SortOption } from "@/lib/api";
import type { Actor } from "@/types/actor";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => String(CURRENT_YEAR - i));

const FALLBACK_ACTOR_IMAGE =
  "https://res.cloudinary.com/dxkloyfs1/image/upload/v1760304531/funny-surreal-dog-oil-painting-funny-surreal-pet-animal-dog-classic-oil-painting-bulldog-upper-class-aristocrat-121874909_q0dxgq.webp";

// Backend already ranks suggestions by name-match quality then TMDB
// popularity (see ActorRepository.suggestActors), so the best-known match
// for a query always lands first here — this just surfaces each actor's
// socials inline instead of making people open the actor page to find them.
const SOCIAL_LINKS = [
  { key: "instagramUsername", Icon: FaInstagram, href: (v: string) => `https://www.instagram.com/${v}`, hover: "hover:text-[#e1306c]" },
  { key: "twitterUsername", Icon: FaTwitter, href: (v: string) => `https://x.com/${v}`, hover: "hover:text-[#1d9bf0]" },
  { key: "facebookUsername", Icon: FaFacebook, href: (v: string) => `https://www.facebook.com/${v}`, hover: "hover:text-[#1877f2]" },
  { key: "youtubeChannel", Icon: FaYoutube, href: (v: string) => `https://www.youtube.com/${v}`, hover: "hover:text-[#ff0000]" },
] as const satisfies { key: keyof Actor; Icon: typeof FaInstagram; href: (value: string) => string; hover: string }[];

type Filters = { genre?: string; year?: string; actor?: string; sort?: SortOption };

export function DiscoverFilters({
  type,
  genre,
  year,
  actor,
  sort,
}: {
  type: "movies" | "series";
  genre?: string;
  year?: string;
  actor?: string;
  sort?: SortOption;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [actorDraft, setActorDraft] = useState(actor ?? "");
  const [suggestions, setSuggestions] = useState<Actor[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const actorFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActorDraft(actor ?? "");
  }, [actor]);

  useEffect(() => {
    if (!actorDraft.trim() || actorDraft === actor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const results = await suggestActors(type === "movies" ? "movie" : "series", actorDraft, controller.signal);
        setSuggestions(results);
        setIsSuggestOpen(true);
        setIsSuggesting(false);
      } catch {
        // aborted or network error — ignore
      }
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorDraft, type]);

  useEffect(() => {
    if (!isSuggestOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (actorFieldRef.current && !actorFieldRef.current.contains(event.target as Node)) setIsSuggestOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isSuggestOpen]);

  const navigate = (next: Filters) => {
    const merged: Filters = { genre, year, actor, sort, ...next };
    const params = new URLSearchParams();
    if (merged.genre) params.set("genre", merged.genre);
    if (merged.year) params.set("year", merged.year);
    if (merged.actor) params.set("actor", merged.actor);
    if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);

    const query = params.toString();
    router.push(query ? `/${type}?${query}` : `/${type}`);
  };

  const activeCount = [genre, year, actor, sort && sort !== "newest" ? sort : undefined].filter(Boolean).length;

  const sortOptions = [
    { value: "newest", label: t("filters.sortNewest") },
    { value: "top_rated", label: t("filters.sortTopRated") },
    { value: "oldest", label: t("filters.sortOldest") },
  ];

  const genreOptions = [
    { value: "", label: t("filters.allGenres") },
    ...ALL_GENRES.map((g) => ({ value: g, label: GENRE_TRANSLATIONS[g]?.[locale] ?? g })),
  ];

  const yearOptions = [{ value: "", label: t("filters.allYears") }, ...YEARS.map((y) => ({ value: y, label: y }))];

  const controls = (
    <>
      <ModernSelect
        value={genre ?? ""}
        options={genreOptions}
        onChange={(value) => navigate({ genre: value || undefined })}
        className="w-full lg:w-auto"
      />
      <ModernSelect
        value={year ?? ""}
        options={yearOptions}
        onChange={(value) => navigate({ year: value || undefined })}
        className="w-full lg:w-auto"
      />
      <ModernSelect
        value={sort ?? "newest"}
        options={sortOptions}
        onChange={(value) => navigate({ sort: value as SortOption })}
        className="w-full lg:w-auto"
      />

      <div ref={actorFieldRef} className="relative w-full lg:w-56">
        <div className="relative flex items-center">
          <User size={15} className="pointer-events-none absolute left-4 text-foreground/40" />
          <input
            value={actorDraft}
            onChange={(event) => {
              setActorDraft(event.target.value);
              setIsSuggesting(!!event.target.value.trim());
              if (!event.target.value.trim()) navigate({ actor: undefined });
            }}
            onFocus={() => suggestions.length > 0 && setIsSuggestOpen(true)}
            placeholder={t("filters.actorPlaceholder")}
            className="w-full rounded-full border border-foreground/10 bg-foreground/5 py-2.5 pr-4 pl-10 text-sm text-foreground placeholder:text-foreground/35 backdrop-blur-md transition-all duration-300 outline-none focus-visible:border-transparent focus-visible:bg-foreground/10 focus-visible:shadow-[0_0_0_2px_#8e2de2]"
          />
          {isSuggesting && <Spinner size={13} className="absolute right-4 border-foreground/25 border-t-foreground/70" />}
        </div>

        {isSuggestOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-30 mt-1.5 max-h-96 w-full overflow-y-auto rounded-2xl border border-foreground/10 bg-surface p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            {suggestions.map((suggestedActor, index) => {
              const age = calculateAge(suggestedActor.birthday);
              const image = suggestedActor.imageURL ? tmdbImage(suggestedActor.imageURL, "w342") : FALLBACK_ACTOR_IMAGE;
              const socials = SOCIAL_LINKS.filter((social) => suggestedActor[social.key]);

              const openActor = () => {
                setPendingActor(suggestedActor);
                setIsSuggestOpen(false);
                router.push(`/actors/${suggestedActor.id}`);
              };

              return (
                <div
                  key={suggestedActor.id}
                  className="group animate-card-in flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors duration-150 hover:bg-foreground/10"
                  style={{ animationDelay: `${Math.min(index, 8) * 35}ms`, animationDuration: "0.35s" }}
                >
                  <button
                    type="button"
                    onClick={openActor}
                    aria-label={suggestedActor.nameInRealLife}
                    className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-foreground/10 ring-1 ring-foreground/15 transition-all duration-200 group-hover:scale-105 group-hover:ring-[#8e2de2]/70"
                  >
                    {image && <FadeInImage src={image} alt={suggestedActor.nameInRealLife} sizes="36px" className="object-cover" />}
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActorDraft(suggestedActor.nameInRealLife);
                        setIsSuggestOpen(false);
                        navigate({ actor: suggestedActor.nameInRealLife });
                      }}
                      className="flex w-full min-w-0 flex-col items-start text-left"
                    >
                      <span className="w-full truncate text-sm font-medium text-foreground/90">{suggestedActor.nameInRealLife}</span>
                      {age && (
                        <span className="text-xs text-foreground/45">
                          {t("actor.age")} {age}
                        </span>
                      )}
                    </button>

                    {socials.length > 0 && (
                      <div className="flex items-center gap-2">
                        {socials.map(({ key, Icon, href, hover }) => (
                          <a
                            key={key}
                            href={href(suggestedActor[key] as string)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className={`text-foreground/35 transition-colors duration-150 ${hover}`}
                          >
                            <Icon size={11} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="mx-auto mt-6 w-[94%] sm:mt-10">
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold backdrop-blur-md transition-all duration-300 ${
            mobileOpen
              ? "border-transparent bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white"
              : "border-foreground/10 bg-foreground/5 text-foreground/80 hover:border-foreground/25 hover:bg-foreground/10"
          }`}
        >
          <SlidersHorizontal size={15} />
          {t("filters.toggle")}
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/25 text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className={`mt-3 flex-col gap-3 lg:mt-0 lg:flex lg:flex-row lg:flex-wrap lg:items-center ${mobileOpen ? "flex" : "hidden"}`}>
        {controls}
      </div>

      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {genre && (
            <FilterChip label={`${t("filters.genre")}: ${GENRE_TRANSLATIONS[genre]?.[locale] ?? genre}`} onRemove={() => navigate({ genre: undefined })} removeLabel={t("filters.removeFilter")} />
          )}
          {year && <FilterChip label={`${t("filters.year")}: ${year}`} onRemove={() => navigate({ year: undefined })} removeLabel={t("filters.removeFilter")} />}
          {actor && (
            <FilterChip
              label={`${t("filters.actor")}: ${actor}`}
              onRemove={() => {
                setActorDraft("");
                navigate({ actor: undefined });
              }}
              removeLabel={t("filters.removeFilter")}
            />
          )}
          {sort && sort !== "newest" && (
            <FilterChip
              label={sort === "top_rated" ? t("filters.sortTopRated") : t("filters.sortOldest")}
              onRemove={() => navigate({ sort: "newest" })}
              removeLabel={t("filters.removeFilter")}
            />
          )}

          <button
            type="button"
            onClick={() => {
              setActorDraft("");
              router.push(`/${type}`);
            }}
            className="text-xs font-semibold text-foreground/50 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("filters.clearAll")}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/5 py-1.5 pr-2 pl-3.5 text-xs font-medium text-foreground/80 backdrop-blur-md">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="flex h-5 w-5 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/15 hover:text-foreground"
      >
        <X size={12} />
      </button>
    </span>
  );
}
