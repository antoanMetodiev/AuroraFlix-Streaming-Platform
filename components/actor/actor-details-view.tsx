"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CalendarDays, Cake, Clapperboard, Flame, MapPin, Maximize2, Sparkles, Tv } from "lucide-react";
import { FaFacebook, FaImdb, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { Footer } from "@/components/layout/footer";
import { BlurredPageBackdrop } from "@/components/movies/details/details-background";
import { hrefFor, type WorkCardItem } from "@/components/media/work-carousel";
import { FullScreenLoader, Spinner } from "@/components/ui/loader";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { RatingRing } from "@/components/ui/rating-ring";
import { consumePendingActor } from "@/lib/actor-session";
import { getActorLatestWorksClient, requestMoreMoviesForActor } from "@/lib/api-public";
import { tmdbImage } from "@/lib/tmdb";
import { calculateAge, formatReleaseDate, releaseDateValue } from "@/lib/dates";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Actor } from "@/types/actor";

const FALLBACK_ACTOR_IMAGE =
  "https://res.cloudinary.com/dxkloyfs1/image/upload/v1760304531/funny-surreal-dog-oil-painting-funny-surreal-pet-animal-dog-classic-oil-painting-bulldog-upper-class-aristocrat-121874909_q0dxgq.webp";

// Only ever needed once someone clicks the portrait, so it has no business
// being in this page's initial bundle — ssr:false is safe (and correct) here
// since a lightbox that opens on click has nothing to show on first paint.
const BigImageLightbox = dynamic(() => import("@/components/ui/big-image-lightbox").then((mod) => mod.BigImageLightbox), {
  ssr: false,
});

const COOLDOWN_KEY_PREFIX = "add_movies_actor_cooldown_";
const COOLDOWN_MS = 3 * 60 * 1000;
/** Longer biographies start collapsed behind "Show more". */
const BIO_PREVIEW_CHARS = 520;
/** One full filmography row at the widest breakpoint loads at once; the rest as they near the screen. */
const EAGER_POSTERS = 6;

type Filter = "all" | "movies" | "series";

export function ActorDetailsView({ id }: { id: string }) {
  const { t, locale } = useTranslation();
  const [pending, setPending] = useState<{ actor: Actor | null; backgroundPath?: string | null } | undefined>(undefined);
  const [works, setWorks] = useState<WorkCardItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [showLightbox, setShowLightbox] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const actor = pending?.actor;

  useEffect(() => {
    // sessionStorage only exists client-side, so this can't be computed during
    // render (would mismatch the server-rendered HTML) — it has to land in an effect.
    const saved = consumePendingActor(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending({ actor: saved?.actor ?? null, backgroundPath: saved?.backgroundImgUrl });
  }, [id]);

  useEffect(() => {
    if (!actor?.imdbId) return;
    getActorLatestWorksClient(actor.imdbId).then((latestWorks) => {
      setWorks(
        latestWorks
          // Newest first; titles without a release date go last.
          .slice()
          .sort((a, b) => releaseDateValue(b.releaseDate) - releaseDateValue(a.releaseDate))
          .map((work) => ({
          key: `${work.TYPE}:${work.tmdbId ?? work.posterURL}`,
          title: work.title ?? work.name_in_real_life,
          posterURL: work.posterURL,
          tmdbRating: work.tmdbRating,
          type: work.TYPE,
          videoURL: work.videoURL,
          tmdbId: work.tmdbId,
          originalTitle: work.originalTitle,
          releaseDate: work.releaseDate,
        }))
      );
    });
  }, [actor?.imdbId]);

  const counts = useMemo(() => {
    const list = works ?? [];
    const series = list.filter((work) => work.type === "SERIES").length;
    return { all: list.length, movies: list.length - series, series };
  }, [works]);
  const shownWorks = (works ?? []).filter((work) =>
    filter === "all" ? true : filter === "series" ? work.type === "SERIES" : work.type !== "SERIES"
  );

  if (pending === undefined) return <FullScreenLoader />;

  if (!actor) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center text-foreground">
          <h1 className="text-xl font-medium">{t("actor.notAvailable")}</h1>
          <p className="text-foreground/70">{t("actor.onlyFromCast")}</p>
          <Link href="/movies" className="rounded-full bg-white px-5 py-2.5 font-semibold text-neutral-900">
            {t("actor.backToMovies")}
          </Link>
        </div>
      </div>
    );
  }

  const image = actor.imageURL ? tmdbImage(actor.imageURL, "w500") : FALLBACK_ACTOR_IMAGE;
  const gender = Number(actor.gender);
  const age = calculateAge(actor.birthday);
  const birthday = (() => {
    const date = actor.birthday ? new Date(actor.birthday) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    try {
      return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return actor.birthday;
    }
  })();
  const popularity = Number(actor.popularity);
  const stats = [
    age ? { Icon: Cake, label: t("actor.statAge"), value: t("actor.ageShort", { age }) } : null,
    birthday ? { Icon: CalendarDays, label: t("actor.statBorn"), value: birthday } : null,
    actor.placeOfBirth ? { Icon: MapPin, label: t("actor.statPlace"), value: actor.placeOfBirth } : null,
    Number.isFinite(popularity) && popularity > 0 ? { Icon: Flame, label: t("actor.statPopularity"), value: popularity.toFixed(1) } : null,
  ].filter((stat): stat is { Icon: typeof Cake; label: string; value: string } => stat !== null);
  const socials = [
    actor.imdbId ? { href: `https://www.imdb.com/name/${actor.imdbId}/`, label: "IMDb", Icon: FaImdb } : null,
    actor.instagramUsername ? { href: `https://www.instagram.com/${actor.instagramUsername}`, label: "Instagram", Icon: FaInstagram } : null,
    actor.twitterUsername ? { href: `https://x.com/${actor.twitterUsername}`, label: "X", Icon: FaXTwitter } : null,
    actor.facebookUsername ? { href: `https://www.facebook.com/${actor.facebookUsername}`, label: "Facebook", Icon: FaFacebook } : null,
  ].filter((social): social is { href: string; label: string; Icon: typeof FaImdb } => social !== null);
  const biography = actor.biography?.trim() ?? "";
  const bioIsLong = biography.length > BIO_PREVIEW_CHARS;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* The background of the title this actor was opened from — same still, blur and shade. */}
      <BlurredPageBackdrop path={pending.backgroundPath} />

      {showLightbox && actor.imageURL && (
        <BigImageLightbox images={[{ url: actor.imageURL, type: "actor" }]} initialIndex={0} onClose={() => setShowLightbox(false)} />
      )}

      <section className="mx-auto grid max-w-[100rem] items-start gap-10 px-4 pt-10 pb-14 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pt-16">
        {/* Portrait */}
        <div className="animate-card-in relative mx-auto w-56 sm:w-72 lg:mx-0 lg:w-full">
          <span aria-hidden className="absolute -inset-6 -z-10 rounded-[3rem] bg-white/10 blur-3xl" />
          {image && (
            <button
              type="button"
              onClick={() => actor.imageURL && setShowLightbox(true)}
              aria-label={t("actor.openPhoto")}
              className="group relative block aspect-[2/3] w-full overflow-hidden rounded-[2rem] shadow-[0_0_40px_-8px_rgba(255,255,255,0.4)] ring-1 ring-white/15"
            >
              <FadeInImage
                src={image}
                alt={actor.nameInRealLife}
                sizes="(min-width: 1024px) 352px, 288px"
                priority
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {actor.imageURL && (
                <span className="absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Maximize2 size={16} />
                </span>
              )}
            </button>
          )}
        </div>

        {/* Name, stats, links, biography */}
        <div className="min-w-0 text-center lg:pt-4 lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/85">
            <Sparkles size={13} />
            {gender === 1 ? t("actor.roleFemale") : t("actor.roleMale")}
          </span>
          <h1 className="mt-4 bg-gradient-to-b from-white to-white/65 bg-clip-text font-display text-4xl leading-[0.95] font-semibold tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-7xl">
            {actor.nameInRealLife}
          </h1>

          {stats.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              {stats.map(({ Icon, label, value }) => (
                <div
                  key={label}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-4 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <Icon aria-hidden className="pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 text-white/[0.05] transition-transform duration-500 group-hover:scale-110" />
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-neutral-900 shadow-[0_6px_20px_-6px_rgba(255,255,255,0.5)]">
                    <Icon size={16} />
                  </span>
                  <p className="mt-3 text-[0.6875rem] font-bold tracking-[0.18em] text-foreground/45 uppercase">{label}</p>
                  <p className="mt-0.5 text-sm leading-snug font-bold break-words text-foreground sm:text-base">{value}</p>
                </div>
              ))}
            </div>
          )}

          {socials.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-foreground/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-neutral-900"
                >
                  <Icon size={15} />
                  {label}
                </a>
              ))}
            </div>
          )}

          {biography && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-5 text-left sm:p-6">
              <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-foreground/45 uppercase">{t("actor.biography")}</p>
              <p className="mt-3 leading-7 whitespace-pre-line text-foreground/80">
                {bioIsLong && !bioExpanded ? `${biography.slice(0, BIO_PREVIEW_CHARS).trimEnd()}…` : biography}
              </p>
              {bioIsLong && (
                <button
                  type="button"
                  onClick={() => setBioExpanded((expanded) => !expanded)}
                  className="mt-4 rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-foreground/85 transition-colors duration-300 hover:bg-white hover:text-neutral-900"
                >
                  {bioExpanded ? t("actor.showLess") : t("actor.showMore")}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <Filmography
        works={works}
        shown={shownWorks}
        counts={counts}
        filter={filter}
        onFilter={setFilter}
        actorName={actor.nameInRealLife}
        actorImdbId={actor.imdbId}
      />

      {/* Fades the page background out into the footer's solid black. */}
      <div aria-hidden className="pointer-events-none relative -z-[1] -mt-48 h-48 bg-gradient-to-b from-transparent to-background" />

      <Footer />
    </div>
  );
}

function Filmography({
  works,
  shown,
  counts,
  filter,
  onFilter,
  actorName,
  actorImdbId,
}: {
  works: WorkCardItem[] | null;
  shown: WorkCardItem[];
  counts: { all: number; movies: number; series: number };
  filter: Filter;
  onFilter: (filter: Filter) => void;
  actorName: string;
  actorImdbId?: string | null;
}) {
  const { t, locale } = useTranslation();
  const tabs = [
    { value: "all" as const, label: t("actor.filterAll"), count: counts.all, Icon: Sparkles },
    { value: "movies" as const, label: t("nav.movies"), count: counts.movies, Icon: Clapperboard },
    { value: "series" as const, label: t("nav.series"), count: counts.series, Icon: Tv },
  ];

  return (
    <section className="mx-auto max-w-[100rem] px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 shrink-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("actor.filmography")}</h2>
          {works && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-foreground/70">{counts.all}</span>}
        </div>
        <RequestMoreButton actorName={actorName} actorImdbId={actorImdbId} />
      </div>

      {works && counts.movies > 0 && counts.series > 0 && (
        <div className="mb-6 inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {tabs.map(({ value, label, count, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilter(value)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-300 ${
                filter === value ? "bg-white text-neutral-900 shadow-[0_4px_16px_-4px_rgba(255,255,255,0.5)]" : "text-foreground/65 hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {label}
              <span className={filter === value ? "text-neutral-500" : "text-foreground/40"}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {works === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-foreground/60">{t("actor.noWorks")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {shown.map((work, index) => {
            const rating = Number(work.tmdbRating);
            const poster = tmdbImage(work.posterURL, "w500");
            return (
              <Link
                key={work.key}
                href={hrefFor(work)}
                className="group animate-card-in block"
                style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_18px_40px_-12px_rgba(255,255,255,0.35)] group-hover:ring-white/35">
                  {poster && (
                    <FadeInImage src={poster} alt={work.title} loading={index < EAGER_POSTERS ? "eager" : "lazy"} sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-white/90 uppercase">
                    {work.type === "SERIES" ? <Tv size={11} /> : <Clapperboard size={11} />}
                    {work.type === "SERIES" ? t("watchlist.series") : t("watchlist.movie")}
                  </span>
                  {Number.isFinite(rating) && rating > 0 && <RatingRing value={rating} size="xs" className="absolute top-2 right-2" />}
                  <div className="absolute inset-x-0 bottom-0 p-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    <p className="line-clamp-2 text-sm leading-snug font-semibold text-white">{work.title}</p>
                    {work.releaseDate && <p className="mt-0.5 text-xs font-medium text-white/60">{formatReleaseDate(work.releaseDate, locale)}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** "Check for more movies with …" — asks the generator for this actor's titles, then cools down. */
function RequestMoreButton({ actorName, actorImdbId }: { actorName: string; actorImdbId?: string | null }) {
  const { t } = useTranslation();
  const [remainingMs, setRemainingMs] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!actorImdbId) return;
    // Per actor, so one actor's cooldown never shows on another's page.
    const cooldownKey = COOLDOWN_KEY_PREFIX + actorImdbId;
    const update = () => {
      const ts = window.localStorage.getItem(cooldownKey);
      const diff = ts ? COOLDOWN_MS - (Date.now() - Number(ts)) : 0;
      if (ts && diff <= 0) window.localStorage.removeItem(cooldownKey);
      setRemainingMs(Math.max(diff, 0));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [actorImdbId]);

  if (!actorImdbId) return null;

  const handleClick = async () => {
    setIsRequesting(true);
    await requestMoreMoviesForActor(actorImdbId);
    window.localStorage.setItem(COOLDOWN_KEY_PREFIX + actorImdbId, Date.now().toString());
    setRemainingMs(COOLDOWN_MS);
    setIsRequesting(false);
  };

  if (remainingMs > 0) {
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return (
      <p className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-sm text-foreground/70">
        {t("carousel.checkingStarted")} {minutes}:{seconds.toString().padStart(2, "0")}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRequesting}
      className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-4px_rgba(255,255,255,0.5)] disabled:pointer-events-none disabled:opacity-60"
    >
      {isRequesting ? <Spinner size={14} /> : <Sparkles size={14} />}
      {`${t("carousel.checkForMoreWith")} ${actorName}`}
    </button>
  );
}
