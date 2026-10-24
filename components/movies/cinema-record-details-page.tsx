import { Footer } from "@/components/layout/footer";
import { DetailsBackground, detailsBackgroundPath } from "@/components/movies/details/details-background";
import { Suspense } from "react";
import { DetailsHeader } from "@/components/movies/details/details-header";
import { FactsSection } from "@/components/movies/details/facts-section";
import { TrailerSection } from "@/components/movies/details/trailer-section";
import { PlayerSection } from "@/components/movies/details/player-section";
import { SeriesWatchSection } from "@/components/movies/details/series-watch-section";
import { SimilarTitlesSection } from "@/components/movies/details/similar-titles-section";
import { TrackLastViewed } from "@/components/movies/details/track-last-viewed";
import { NavSection } from "@/components/movies/details/nav-section";
import { SectionNav } from "@/components/movies/details/section-nav";
import {
  LazyCastSection,
  LazyImageGallery,
  LazyCommentsSection,
} from "@/components/movies/details/lazy-sections";

import { Reveal } from "@/components/ui/reveal";
import { tmdbImage } from "@/lib/tmdb";

import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export function CinemaRecordDetailsPage({
  record,
  type,
}: {
  record: Movie | Series;
  type: "movie" | "series";
}) {
  return (
    // -mt-16 lifts the whole page (banner first) up under the floating header.
    // It has to be here, not on the banner: overflow-x-hidden also clips
    // vertically, so a banner pulled above this box would be cut off.
    <div className="relative isolate -mt-16 min-h-screen w-full overflow-x-hidden">
      <DetailsBackground record={record} />

      <TrackLastViewed
        record={record}
        type={type}
      />

      <SectionNav />

      <article className="relative">
        <NavSection id="overview" label="sections.overview">
          <DetailsHeader
            record={record}
            type={type}
          />
        </NavSection>

        {/* Streams in on its own, so the rest of the page doesn't wait for it. */}
        <NavSection id="info" label="facts.title">
          <Suspense fallback={null}>
            <FactsSection type={type} tmdbId={record.tmdbId} />
          </Suspense>
        </NavSection>

        {record.trailerURL && (
          <NavSection id="trailer" label="sections.trailer">
            <Reveal>
              <TrailerSection
                trailerURL={
                  record.trailerURL
                }
              />
            </Reveal>
          </NavSection>
        )}

        <NavSection id="cast" label="sections.cast">
          <LazyCastSection
            cast={record.castList ?? []}
            backgroundImgUrl={
              // The actor page reuses this page's background.
              detailsBackgroundPath(record)
            }
          />
        </NavSection>

        {record.imagesList &&
          record.imagesList.length >
            0 && (
            <NavSection id="images" label="sections.images">
              <LazyImageGallery
                images={
                  record.imagesList
                }
              />
            </NavSection>
          )}

        {/* Series: the episodes section runs its own float-up entrance. */}
        {type === "series" ? (
          <NavSection id="watch" label="sections.episodes">
            <SeriesWatchSection
              record={record as Series}
            />
          </NavSection>
        ) : (
          record.videoURL && (
            <NavSection id="watch" label="sections.watch">
              <Reveal>
                <PlayerSection
                  videoUrl={
                    record.videoURL
                  }

                  title={
                    record.title
                  }

                  poster={tmdbImage(
                    record.backgroundImg_URL ??
                      record.posterImgURL,
                    "w1280"
                  )}
                />
              </Reveal>
            </NavSection>
          )
        )}

        {/* Streams in on its own, after the rest of the page. */}
        <NavSection id="similar" label="sections.similar">
          <Suspense fallback={null}>
            <SimilarTitlesSection record={record} type={type} />
          </Suspense>
        </NavSection>

        <NavSection id="comments" label="comments.title">
          <Reveal>
            <LazyCommentsSection
              recordId={record.id}
              type={type}
            />
          </Reveal>
        </NavSection>

        {/* Fades the page background out into the footer's solid black. */}
        <div aria-hidden className="pointer-events-none relative -z-[1] -mt-48 h-48 bg-gradient-to-b from-transparent to-background" />

        <Footer />
      </article>
    </div>
  );
}