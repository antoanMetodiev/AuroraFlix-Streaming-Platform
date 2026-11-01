/**
 * The /movies and /series lists' page background (genre and title-search
 * results included): plain black.
 *
 * Fixed and on its own GPU layer for the same reasons as BlurredPageBackdrop:
 * height is 100lvh so a phone's address bar can't resize it while scrolling.
 */
export function ListBackground() {
  return (
    <div
      aria-hidden
      // h-screen is the fallback for browsers without lvh units.
      style={{ height: "100lvh" }}
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-screen overflow-hidden bg-black [transform:translateZ(0)] will-change-transform"
    />
  );
}
