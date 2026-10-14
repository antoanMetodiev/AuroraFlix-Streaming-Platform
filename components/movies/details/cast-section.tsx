"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { calculateAge } from "@/lib/dates";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { setPendingActor } from "@/lib/actor-session";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { useHorizontalScroll } from "@/lib/use-horizontal-scroll";
import { CarouselArrowButton } from "@/components/ui/carousel-arrow-button";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Actor } from "@/types/actor";

const FALLBACK_ACTOR_IMAGE =
  "https://res.cloudinary.com/dxkloyfs1/image/upload/v1760304531/funny-surreal-dog-oil-painting-funny-surreal-pet-animal-dog-classic-oil-painting-bulldog-upper-class-aristocrat-121874909_q0dxgq.webp";

export function CastSection({ cast, backgroundImgUrl }: { cast: Actor[]; backgroundImgUrl?: string | null }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.3);
  const { containerRef, canScrollLeft, canScrollRight, scrollBy, dragHandlers } = useHorizontalScroll<HTMLDivElement>([cast]);

  if (cast.length === 0) return null;

  return (
    <section
      ref={ref}
      className={`reveal mx-auto max-w-[100rem] px-4 pt-4 pb-16 sm:px-6 sm:pb-24 ${inView ? "" : "reveal-hidden"}`}
    >
      <SectionHeading>{t("sections.topCast")}</SectionHeading>

      <div className="relative">
        {canScrollLeft && <CarouselArrowButton direction="left" onClick={() => scrollBy(-400)} />}
        {canScrollRight && <CarouselArrowButton direction="right" onClick={() => scrollBy(400)} />}

        <div ref={containerRef} className="scrollbar-none -mt-3 flex snap-x gap-4 overflow-x-auto pt-3 pb-6" {...dragHandlers}>
          {cast.map((actor) => (
            <ActorCard
              key={actor.id}
              actor={actor}
              onOpen={() => {
                setPendingActor(actor, backgroundImgUrl);
                router.push(`/actors/${actor.id}`);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Los Angeles, California, USA" → "Los Angeles, USA" — the card has little room. */
function shortPlace(place?: string | null) {
  if (!place) return "";
  const parts = place.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : parts.join(", ");
}

/**
 * A portrait card with the name over the photo. On hover (or keyboard focus)
 * it lifts, the photo slowly zooms, a light sheen sweeps across, and a glass
 * panel grows up from the bottom with the actor's age, birthplace, the start
 * of the biography and a "view profile" cue. On touch screens there's no
 * hover — a tap simply opens the actor page, same as before.
 */
function ActorCard({ actor, onOpen }: { actor: Actor; onOpen: () => void }) {
  const { t } = useTranslation();
  const image = actor.imageURL ? tmdbImage(actor.imageURL, "w342") : FALLBACK_ACTOR_IMAGE;
  const age = calculateAge(actor.birthday);
  const place = shortPlace(actor.placeOfBirth);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group/actor relative w-[9.5rem] shrink-0 snap-start rounded-2xl text-left outline-none sm:w-[11rem]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-all duration-500 ease-out group-hover/actor:-translate-y-1.5 group-hover/actor:shadow-[0_18px_40px_-12px_rgba(255,255,255,0.35)] group-hover/actor:ring-white/35 group-focus-visible/actor:-translate-y-1.5 group-focus-visible/actor:ring-2 group-focus-visible/actor:ring-white">
        {image && (
          <FadeInImage
            src={image}
            alt={actor.nameInRealLife}
            sizes="176px"
            className="object-cover transition-transform duration-700 ease-out group-hover/actor:scale-110"
          />
        )}

        {/* Always-on shade so the name reads; deepens on hover for the panel. */}
        <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent transition-colors duration-500" />
        <span className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover/actor:bg-black/25" />

        {/* Sheen sweeping across on hover. */}
        <span className="pointer-events-none absolute inset-y-0 -left-full w-2/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-out group-hover/actor:translate-x-[350%]" />

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h4 className="line-clamp-2 text-sm leading-snug font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-[0.95rem]">
            {actor.nameInRealLife}
          </h4>
          {age && <p className="mt-0.5 text-[11px] font-medium text-white/65">{t("actor.ageShort", { age })}</p>}

          {/* Hover panel — grid-rows 0fr → 1fr animates to its natural height. */}
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-hover/actor:grid-rows-[1fr] group-focus-visible/actor:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/15 bg-white/10 p-2.5 opacity-0 backdrop-blur-md transition-opacity delay-100 duration-300 group-hover/actor:opacity-100 group-focus-visible/actor:opacity-100">
                {place && (
                  <p className="flex items-start gap-1 text-[11px] leading-tight text-white/80">
                    <MapPin size={12} className="mt-px shrink-0" />
                    <span className="line-clamp-2">{place}</span>
                  </p>
                )}
                {actor.biography && <p className="line-clamp-3 text-[11px] leading-snug text-white/70">{actor.biography}</p>}
                <span className="flex items-center justify-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-900">
                  {t("actor.viewProfile")}
                  <ArrowRight size={12} className="transition-transform duration-300 group-hover/actor:translate-x-0.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
