/**
 * Seasonal themes: switched on by date, no config. Each one gets light
 * particles on the homepage (SeasonalEffects), with an on/off switch
 * (SeasonalToggle). `?season=<name>` previews any of them (or `none`).
 */
export type Season = "winter" | "halloween" | "valentine";

export const SEASONS: Season[] = ["winter", "halloween", "valentine"];

/** month is 1-12. Ranges are inclusive and may wrap the new year. */
const WINDOWS: { season: Season; from: [number, number]; to: [number, number] }[] = [
  // Christmas markets and lights go up in the second half of November.
  { season: "winter", from: [11, 20], to: [1, 6] },
  { season: "halloween", from: [10, 20], to: [11, 1] },
  { season: "valentine", from: [2, 7], to: [2, 15] },
];

export function activeSeason(date: Date = new Date(), override?: string | null): Season | null {
  if (override === "none") return null;
  if (override && (SEASONS as string[]).includes(override)) return override as Season;
  const key = (date.getMonth() + 1) * 100 + date.getDate();
  for (const { season, from, to } of WINDOWS) {
    const start = from[0] * 100 + from[1];
    const end = to[0] * 100 + to[1];
    if (start <= end ? key >= start && key <= end : key >= start || key <= end) return season;
  }
  return null;
}

/** localStorage switch for the particles — on unless the viewer turned them off. */
export const SEASONAL_FX_KEY = "aurora-seasonal-fx";
export const SEASONAL_FX_EVENT = "aurora-seasonal-fx-change";

export function readSeasonalFx(): boolean {
  try {
    return window.localStorage.getItem(SEASONAL_FX_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeSeasonalFx(on: boolean) {
  try {
    window.localStorage.setItem(SEASONAL_FX_KEY, on ? "on" : "off");
  } catch {
    // storage blocked — the switch just won't be remembered
  }
  window.dispatchEvent(new CustomEvent(SEASONAL_FX_EVENT, { detail: on }));
}
