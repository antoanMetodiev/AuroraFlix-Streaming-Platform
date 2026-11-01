/**
 * The /movies and /series lists' page background (genre and title-search
 * results included): no image, just a dark gradient — a charcoal glow over
 * the top of the page, melting into black further down, with a light
 * vignette at the edges.
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
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-screen overflow-hidden bg-background [transform:translateZ(0)] will-change-transform"
    >
      <span className="absolute inset-0 bg-gradient-to-b from-[#262626] via-[#121212] via-55% to-black" />
      <span className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_0%,rgba(255,255,255,0.1),transparent_75%)]" />
      <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.7)_100%)]" />
    </div>
  );
}
