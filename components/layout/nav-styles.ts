/**
 * Shared looks for the header's controls, so every round button and every
 * drop-down panel in it (search, friends, notifications, menu) reads as one
 * set — the same dark glass and white-pill language as the rest of the site
 * (the Watchlist's tabs and stat cards, the playlist cards).
 */

/** A round icon button: faint glass at rest, turns into a white pill on hover / while its panel is open. */
export const NAV_ICON_BUTTON =
  "relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-foreground/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:bg-white hover:text-neutral-900 hover:shadow-[0_6px_20px_-6px_rgba(255,255,255,0.55)] aria-expanded:border-transparent aria-expanded:bg-white aria-expanded:text-neutral-900 aria-expanded:shadow-[0_6px_20px_-6px_rgba(255,255,255,0.55)]";

/** The count badge on an icon button — ringed in black so it stays readable when the button turns white. */
export const NAV_BADGE =
  "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[0.625rem] font-bold text-neutral-900 ring-2 ring-black";

/** The surface of a drop-down panel under the header (position / size / open state stay with each panel). */
export const NAV_PANEL =
  "rounded-[1.75rem] border border-white/15 bg-neutral-950/85 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150";
