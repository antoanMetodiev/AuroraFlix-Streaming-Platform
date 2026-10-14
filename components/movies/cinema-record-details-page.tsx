import { Footer } from "@/components/layout/footer";
import { DetailsBackground } from "@/components/movies/details/details-background";
import { DetailsHeader } from "@/components/movies/details/details-header";
import { TrailerSection } from "@/components/movies/details/trailer-section";
import { PlayerSection } from "@/components/movies/details/player-section";
import { SeriesWatchSection } from "@/components/movies/details/series-watch-section";
import { TrackLastViewed } from "@/components/movies/details/track-last-viewed";
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
    <div className="relative isolate min-h-screen w-full overflow-x-hidden">
      <DetailsBackground record={record} />

      <TrackLastViewed
        record={record}
        type={type}
      />

      <article className="relative">
        <DetailsHeader
          record={record}
          type={type}
        />

        {record.trailerURL && (
          <Reveal>
            <TrailerSection
              trailerURL={
                record.trailerURL
              }
            />
          </Reveal>
        )}

        <LazyCastSection
          cast={record.castList ?? []}
          backgroundImgUrl={
            record.backgroundImg_URL
          }
        />

        {record.imagesList &&
          record.imagesList.length >
            0 && (
            <LazyImageGallery
              images={
                record.imagesList
              }
            />
          )}

        {/* Series: the episodes section runs its own float-up entrance. */}
        {type === "series" ? (
          <SeriesWatchSection
            record={record as Series}
          />
        ) : (
          record.videoURL && (
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
          )
        )}

        <Reveal>
          <LazyCommentsSection
            recordId={record.id}
            type={type}
          />
        </Reveal>

        {/* Fades the page background out into the footer's solid black. */}
        <div aria-hidden className="pointer-events-none relative -z-[1] -mt-48 h-48 bg-gradient-to-b from-transparent to-background" />

        <Footer />
      </article>
    </div>
  );
}