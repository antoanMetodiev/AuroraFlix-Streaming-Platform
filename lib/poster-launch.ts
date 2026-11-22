/**
 * The poster → details "flight": clicking a card lifts a copy of its poster
 * off the grid and glides it to the middle of the screen, where it hovers
 * above the details page's full-screen loader (app/movies/[slug]/loading.tsx)
 * while the page loads. When the page mounts, its poster
 * (PosterLandingTarget) calls landPoster and the copy flies into its place.
 *
 * React's <ViewTransition> morph can't do this here: it only pairs elements
 * rendered in the same commit, and these pages always suspend into the loader
 * first. So it's done by hand — one fixed <img> and the Web Animations API.
 *
 * Anything off (reduced motion, a modified click opening a new tab, the page
 * never arriving) just leaves the normal navigation; a stray copy removes
 * itself after MAX_WAIT_MS.
 */

import type { MouseEvent as ReactMouseEvent } from "react";

const MAX_WAIT_MS = 8_000;
const LIFT_MS = 520;
const LAND_MS = 560;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type Flight = { img: HTMLImageElement; href: string; timer: number };
let flight: Flight | null = null;

function removeFlight() {
  if (!flight) return;
  window.clearTimeout(flight.timer);
  flight.img.remove();
  flight = null;
}

function frameOf(rect: DOMRect | { left: number; top: number; width: number; height: number }) {
  return { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` };
}

/** Call from the card link's onClick, with the poster's frame and image. */
export function launchPoster(event: ReactMouseEvent, frame: HTMLElement | null, src: string | null, href: string) {
  if (!frame || !src) return;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  removeFlight();
  const from = frame.getBoundingClientRect();
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  Object.assign(img.style, {
    position: "fixed",
    zIndex: "110", // above FullScreenLoader's z-100
    objectFit: "cover",
    borderRadius: "16px",
    pointerEvents: "none",
    boxShadow: "0 30px 80px -20px rgba(0,0,0,0.9), 0 0 60px -10px rgba(255,255,255,0.25)",
    ...frameOf(from),
  });
  document.body.appendChild(img);

  // Hover pose: centred, as big as fits comfortably.
  const height = Math.min(window.innerHeight * 0.62, 540);
  const width = (height * 2) / 3;
  const to = { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height };
  img.animate([frameOf(from), frameOf(to)], { duration: LIFT_MS, easing: EASE, fill: "forwards" });
  // A slow breathe while it waits for the page.
  img.animate([{ opacity: 1 }, { opacity: 0.82 }, { opacity: 1 }], { duration: 1600, delay: LIFT_MS, iterations: Infinity });

  flight = { img, href, timer: window.setTimeout(removeFlight, MAX_WAIT_MS) };
  // Back/forward before the page arrived: nothing will land it.
  window.addEventListener("popstate", removeFlight, { once: true });
}

/** Called once by the details page's poster after it mounts. */
export function landPoster(target: HTMLElement) {
  if (!flight) return;
  const current = flight;
  const pathname = decodeURIComponent(window.location.pathname);
  if (decodeURIComponent(current.href.split("?")[0]) !== pathname) return removeFlight();

  window.clearTimeout(current.timer);
  const { img } = current;
  const from = img.getBoundingClientRect();
  img.getAnimations().forEach((animation) => animation.cancel());
  Object.assign(img.style, frameOf(from));

  const to = target.getBoundingClientRect();
  const visible = to.bottom > 0 && to.top < window.innerHeight && to.width > 0;
  target.style.opacity = "0";
  const done = () => {
    target.style.opacity = "";
    if (flight === current) flight = null;
    img.remove();
  };

  if (!visible) {
    img.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.92)" }], { duration: 300, fill: "forwards" }).onfinish = done;
    return;
  }
  const radius = getComputedStyle(target).borderRadius || "12px";
  img.animate(
    [
      { ...frameOf(from), borderRadius: "16px" },
      { ...frameOf(to), borderRadius: radius },
    ],
    { duration: LAND_MS, easing: EASE, fill: "forwards" }
  ).onfinish = done;
}
