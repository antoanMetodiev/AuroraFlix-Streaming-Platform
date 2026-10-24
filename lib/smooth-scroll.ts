// The browser's own `behavior: "smooth"` is fast and its speed can't be set,
// so the details page's in-page jumps (watch button, section rail) glide with
// this instead: a long ease-in-out whose duration grows with the distance.

const MIN_DURATION_MS = 2200;
const MAX_DURATION_MS = 4500;
// Matches the targets' scroll-mt-24 (6rem), so the floating header never covers them.
const TOP_OFFSET_PX = 96;

let cancelCurrent: (() => void) | null = null;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Slowly scrolls the window so `element` lands just under the header. */
export function slowScrollTo(element: HTMLElement) {
  cancelCurrent?.();

  const start = window.scrollY;
  const end = Math.max(0, element.getBoundingClientRect().top + start - TOP_OFFSET_PX);
  const distance = end - start;
  if (Math.abs(distance) < 2) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, end);
    return;
  }

  const duration = Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.abs(distance) * 1.2));
  const startedAt = performance.now();
  let frame = 0;

  // Any manual scroll by the user takes over immediately.
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
    cancelCurrent = null;
  };
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);
  cancelCurrent = stop;

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    // "instant": the global `scroll-behavior: smooth` would otherwise animate every frame on its own.
    window.scrollTo({ top: start + distance * easeInOutCubic(progress), behavior: "instant" });
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
}
