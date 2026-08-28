import { Footer } from "@/components/layout/footer";
import { DetailsHeader } from "@/components/movies/details/details-header";
import { TrailerSection } from "@/components/movies/details/trailer-section";
import { PlayerSection } from "@/components/movies/details/player-section";
import { SeriesWatchSection } from "@/components/movies/details/series-watch-section";
import { TrackLastViewed } from "@/components/movies/details/track-last-viewed";
import { LazyCastSection, LazyImageGallery, LazyCommentsSection } from "@/components/movies/details/lazy-sections";
import { tmdbImage } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export function CinemaRecordDetailsPage({ record, type }: { record: Movie | Series; type: "movie" | "series" }) {
  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden">
      <TrackLastViewed record={record} type={type} />

      <article className="relative">
        <DetailsHeader record={record} type={type} />

        {record.trailerURL && <TrailerSection trailerURL={record.trailerURL} />}

        <LazyCastSection cast={record.castList ?? []} backgroundImgUrl={record.backgroundImg_URL} />

        {record.imagesList && record.imagesList.length > 0 && <LazyImageGallery images={record.imagesList} />}

        {type === "series" ? (
          <SeriesWatchSection record={record as Series} />
        ) : (
          (record.videoURL || (record as Movie).vidmPlayer) && (
            <PlayerSection
              videoUrl={record.videoURL}
              vidmPlayer={(record as Movie).vidmPlayer}
              title={record.title}
              poster={tmdbImage(record.backgroundImg_URL ?? record.posterImgURL, "w1280")}
            />
          )
        )}

        <LazyCommentsSection recordId={record.id} type={type} />

        <Footer />
      </article>
    </div>
  );
}
