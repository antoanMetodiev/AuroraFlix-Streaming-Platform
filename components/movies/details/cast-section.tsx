"use client";

import { useRouter } from "next/navigation";
import { tmdbImage } from "@/lib/tmdb";
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
      className={`mx-auto max-w-[100rem] px-4 pt-4 pb-16 transition-all duration-500 sm:px-6 sm:pb-24 ${
        inView ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      }`}
    >
      <SectionHeading>{t("sections.topCast")}</SectionHeading>

      <div className="relative">
        {canScrollLeft && <CarouselArrowButton direction="left" onClick={() => scrollBy(-400)} />}
        {canScrollRight && <CarouselArrowButton direction="right" onClick={() => scrollBy(400)} />}

        <div ref={containerRef} className="scrollbar-none flex snap-x gap-4 overflow-x-auto pb-2" {...dragHandlers}>
          {cast.map((actor) => {
            const image = actor.imageURL ? tmdbImage(actor.imageURL, "w342") : FALLBACK_ACTOR_IMAGE;
            const name = actor.nameInRealLife.length >= 17 ? `${actor.nameInRealLife.slice(0, 16)}..` : actor.nameInRealLife;

            return (
              <button
                key={actor.id}
                type="button"
                onClick={() => {
                  setPendingActor(actor, backgroundImgUrl);
                  router.push(`/actors/${actor.id}`);
                }}
                className="group flex w-[9.5em] shrink-0 snap-start flex-col items-start gap-2 text-left sm:w-[10.8em]"
              >
                <div className="relative aspect-[10.8/14.7] w-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-white/30 group-hover:shadow-[0_12px_30px_-8px_rgba(255,255,255,0.4)]">
                  {image && (
                    <FadeInImage
                      src={image}
                      alt={actor.nameInRealLife}
                      sizes="173px"
                      className="object-cover group-hover:scale-108"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <h4 className="text-sm font-semibold text-foreground sm:text-[1.01em]">{name}</h4>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
