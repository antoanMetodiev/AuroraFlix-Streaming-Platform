"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FaFacebook, FaImdb, FaInstagram, FaTwitter } from "react-icons/fa";
import { Footer } from "@/components/layout/footer";
import { WorkCarousel, type WorkCardItem } from "@/components/media/work-carousel";
import { FullScreenLoader, Loader } from "@/components/ui/loader";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { consumePendingActor } from "@/lib/actor-session";
import { getActorLatestWorksClient } from "@/lib/api-public";
import { tmdbImage } from "@/lib/tmdb";
import { calculateAge } from "@/lib/dates";
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

export function ActorDetailsView({ id }: { id: string }) {
  const { t } = useTranslation();
  const [actor, setActor] = useState<Actor | null | undefined>(undefined);
  const [works, setWorks] = useState<WorkCardItem[]>([]);
  const [worksLoaded, setWorksLoaded] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    // sessionStorage only exists client-side, so this can't be computed during
    // render (would mismatch the server-rendered HTML) — it has to land in an effect.
    const pending = consumePendingActor(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActor(pending?.actor ?? null);
  }, [id]);

  useEffect(() => {
    if (!actor?.imdbId) return;
    getActorLatestWorksClient(actor.imdbId).then((latestWorks) => {
      setWorks(
        latestWorks.map((work) => ({
          key: work.posterURL,
          title: work.title ?? work.name_in_real_life,
          posterURL: work.posterURL,
          tmdbRating: work.tmdbRating,
          type: work.TYPE,
          videoURL: work.videoURL,
          tmdbId: work.tmdbId,
        }))
      );
      setWorksLoaded(true);
    });
  }, [actor?.imdbId]);

  const isLoadingWorks = Boolean(actor?.imdbId) && !worksLoaded;

  if (actor === undefined) return <FullScreenLoader />;

  if (!actor) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center text-foreground">
          <h1 className="text-xl font-medium">{t("actor.notAvailable")}</h1>
          <p className="text-foreground/70">{t("actor.onlyFromCast")}</p>
          <Link href="/movies" className="rounded-lg bg-foreground px-4 py-2 font-medium text-background">
            {t("actor.backToMovies")}
          </Link>
        </div>
      </div>
    );
  }

  const image = actor.imageURL ? tmdbImage(actor.imageURL, "w500") : FALLBACK_ACTOR_IMAGE;
  const biography = actor.biography && actor.biography.length > 600 ? actor.biography.slice(0, 600) : actor.biography;
  const gender = Number(actor.gender);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {showLightbox && actor.imageURL && (
        <BigImageLightbox images={[{ url: actor.imageURL, type: "actor" }]} initialIndex={0} onClose={() => setShowLightbox(false)} />
      )}

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center text-foreground">
        {image && (
          <button type="button" onClick={() => setShowLightbox(true)} className="relative aspect-[13/20] w-[13em] max-w-[70vw] overflow-hidden rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-transform duration-300 hover:scale-95">
            <FadeInImage src={image} alt={actor.nameInRealLife} sizes="208px" className="object-cover" />
          </button>
        )}

        {actor.nameInRealLife && <h1 className="mt-3 text-2xl font-normal tracking-wide">{actor.nameInRealLife}</h1>}

        {biography && (
          <p className="w-[min(58em,90vw)] text-lg leading-8 font-light text-foreground/85 italic">- {biography}</p>
        )}

        <div className="my-1 flex justify-center gap-2.5">
          {actor.instagramUsername && (
            <a href={`https://www.instagram.com/${actor.instagramUsername}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 transition-transform hover:scale-115">
              <FaInstagram size={24} className="text-foreground" />
            </a>
          )}
          {actor.twitterUsername && (
            <a href={`https://x.com/${actor.twitterUsername}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 transition-transform hover:scale-115">
              <FaTwitter size={24} className="text-foreground" />
            </a>
          )}
          {actor.imdbId && (
            <a href={`https://www.imdb.com/name/${actor.imdbId}/?ref_=tt_cst_i_1`} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 transition-transform hover:scale-115">
              <FaImdb size={24} className="text-foreground" />
            </a>
          )}
          {actor.facebookUsername && (
            <a href={`https://www.facebook.com/${actor.facebookUsername}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 transition-transform hover:scale-115">
              <FaFacebook size={24} className="text-foreground" />
            </a>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          {actor.placeOfBirth && (
            <h3>
              {t("actor.placeOfBirth")} <span className="text-foreground/60 italic">{actor.placeOfBirth}</span>
            </h3>
          )}
          {actor.birthday && (
            <h3>
              {t("actor.birthday")}{" "}
              <span className="text-foreground/60 italic">
                {actor.birthday} ({t("actor.age")} {calculateAge(actor.birthday)})
              </span>
            </h3>
          )}
          {actor.knownFor && (
            <h3>
              {t("actor.knownFor")} <span className="text-foreground/60 italic">{actor.knownFor}</span>
            </h3>
          )}
          {(gender === 1 || gender === 2) && (
            <h3>
              {t("actor.gender")} <span className="text-foreground/60 italic">{gender === 1 ? t("actor.female") : t("actor.male")}</span>
            </h3>
          )}
          {actor.popularity && (
            <h3>
              {t("actor.popularity")} <span className="text-foreground/60 italic">{Number(actor.popularity).toFixed(1)}</span>
            </h3>
          )}
        </div>
      </section>

      {isLoadingWorks ? (
        <Loader />
      ) : (
        <WorkCarousel items={works} mode="latest-works" actorName={actor.nameInRealLife} actorImdbId={actor.imdbId} />
      )}

      <Footer />
    </div>
  );
}
