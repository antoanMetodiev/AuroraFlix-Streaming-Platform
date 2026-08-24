import { tmdbImage } from "@/lib/tmdb";
import { getImagesByType } from "@/lib/images";
import { BlurredBackdrop } from "@/components/ui/blurred-backdrop";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export function DetailsBackground({ record }: { record: Movie | Series }) {
  // Prefer the first poster from the gallery — it reads much better blurred
  // than a wide backdrop does — and only fall back to the same image used at
  // the top of the page when there's no gallery to pull one from.
  // It's blurred and dimmed heavily, so there's no point paying for a large
  // image here — w500 is plenty and noticeably lighter to fetch.
  const [firstPoster] = getImagesByType(record.imagesList, "POSTER", 1);
  const src = tmdbImage(firstPoster?.imageURL ?? record.backgroundImg_URL, "w500");
  if (!src) return null;

  return <BlurredBackdrop src={src} overlayOpacity={0.5} />;
}
