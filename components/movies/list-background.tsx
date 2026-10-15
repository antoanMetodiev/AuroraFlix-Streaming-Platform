import { BlurredPageBackdrop } from "@/components/movies/details/details-background";

/**
 * The /movies and /series lists' page background (genre and title-search
 * results included): a fixed still of their own under the same blur, shade
 * and vignette as the details page's background.
 */
export function ListBackground({ type }: { type: "movies" | "series" }) {
  const src = type === "movies" ? "/movie-background-image.webp" : "/series-background-image.webp";
  return <BlurredPageBackdrop src={src} />;
}
