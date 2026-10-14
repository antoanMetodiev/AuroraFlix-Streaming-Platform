import type Lenis from "lenis";

/**
 * The site-wide Lenis instance (see components/layout/smooth-scroll.tsx), kept
 * here so anything that locks or jumps the page scroll can talk to it. Lenis
 * drives the window's scroll itself, so `body { overflow: hidden }` alone no
 * longer stops the wheel — scroll locks must call stopSmoothScroll() too.
 * Every helper is a no-op when Lenis isn't running (touch devices, reduced
 * motion), where the browser's own scrolling is in charge.
 */
let instance: Lenis | null = null;

export function registerSmoothScroll(lenis: Lenis | null) {
  instance = lenis;
}

export function stopSmoothScroll() {
  instance?.stop();
}

export function startSmoothScroll() {
  instance?.start();
}

/** Jumps to the top with no animation, cancelling any glide in progress. */
export function resetSmoothScroll() {
  instance?.scrollTo(0, { immediate: true, force: true });
}
