import Image from "next/image";
import { tmdbImage } from "@/lib/tmdb";
import { getImagesByType } from "@/lib/images";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

/**
 * The details page's page-wide background: the 2nd still from the gallery
 * ("Кадри") — the 1st is usually the same shot as the banner up top — heavily
 * blurred, dimmed and vignetted, falling back to the 1st still / the banner.
 *
 * Built to stay perfectly still while scrolling, which the old BlurredBackdrop
 * version didn't on phones and 4K TVs:
 * - Height is 100lvh (the *large* viewport), not inset-0 / 100vh, so a phone's
 *   address bar sliding away doesn't resize it — that resize is what made the
 *   image "hang" for a moment and then stretch.
 * - No animation: the old endless zoom-rotate made the browser re-blur the
 *   whole full-screen image every frame, which big screens choke on.
 * - Its own GPU layer (translateZ + will-change), so scrolling only moves the
 *   content above it and never repaints the blur.
 * - A mid-size (w1280) source: only lightly blurred, so it needs some detail,
 *   but loading it straight (unoptimized) keeps a 4K TV from requesting a
 *   huge optimized variant.
 */
export function DetailsBackground({ record }: { record: Movie | Series }) {
  return <BlurredPageBackdrop path={detailsBackgroundPath(record)} />;
}

/** The TMDB image path a record's details page uses as its background. */
export function detailsBackgroundPath(record: Movie | Series): string | null {
  const stills = getImagesByType(record.imagesList, "BACKDROP", 2);
  return stills[1]?.imageURL ?? stills[0]?.imageURL ?? record.backgroundImg_URL ?? null;
}

/**
 * The fixed, blurred, shaded page background itself — also used by the actor
 * page, which shows the background of the title it was opened from.
 */
export function BlurredPageBackdrop({ path, src: imageSrc }: { path?: string | null; src?: string }) {
  const src = imageSrc ?? tmdbImage(path, "w1280");
  if (!src) return null;

  return (
    <div
      aria-hidden
      // h-screen is the fallback for browsers without lvh units.
      style={{ height: "100lvh" }}
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-screen overflow-hidden [transform:translateZ(0)] will-change-transform"
    >
      {/* scale-110 pushes the blur's soft, see-through edges off-screen. */}
      <Image src={src} alt="" fill unoptimized sizes="100vw" className="scale-110 object-cover blur-md" />
      <span className="absolute inset-0 bg-black/55" />
      {/* The "shadow": a vignette darkening the edges toward the page's black. */}
      <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)]" />
    </div>
  );
}
