/**
 * All three embed providers turn out to broadcast their real playback
 * position via `postMessage` to the parent window — undocumented, but
 * confirmed by capturing what each one actually sends:
 *
 *  - vidsrc2.ru: {type:"PLAYER_EVENT", data:{player_status, player_progress, player_duration}}
 *  - vidfast.vc: {type:"PLAYER_EVENT", data:{event, currentTime, duration, playing}}
 *  - cinesrc.st: {type:"cinesrc:timeupdate"|"cinesrc:play"|"cinesrc:pause"|"cinesrc:seeking"|"cinesrc:seeked", currentTime, duration}
 *
 * This lets the subtitle overlay track the *real* video position instead of
 * a guessed clock — automatic sync, seeks included, no manual nudging.
 * If a provider ever stops sending these (they're unofficial and undocumented,
 * so that's a "when" not an "if"), the overlay falls back to its own clock —
 * see subtitle-overlay.tsx.
 */

export type PlayerId = 1 | 2 | 3;

export type TelemetryUpdate = {
  currentTime?: number;
  duration?: number;
  playing?: boolean;
};

/** The origin each provider's iframe actually loads from. */
export const PLAYER_ORIGIN: Record<PlayerId, string> = {
  1: "https://vidsrc2.ru",
  2: "https://vidfast.vc",
  3: "https://cinesrc.st",
};

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Parses one postMessage payload for the given player into a partial
 * telemetry update, or null if this message isn't a playback update we
 * recognize (or is missing the fields we need).
 */
export function extractTelemetry(player: PlayerId, raw: unknown): TelemetryUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const message = raw as Record<string, unknown>;

  if (player === 1) {
    if (message.type !== "PLAYER_EVENT") return null;
    const data = message.data as Record<string, unknown> | undefined;
    if (!data) return null;

    const update: TelemetryUpdate = {};
    const currentTime = numberOrUndefined(data.player_progress);
    const duration = numberOrUndefined(data.player_duration);
    if (currentTime !== undefined) update.currentTime = currentTime;
    if (duration !== undefined) update.duration = duration;
    if (typeof data.player_status === "string") update.playing = data.player_status === "playing";

    return Object.keys(update).length ? update : null;
  }

  if (player === 2) {
    if (message.type !== "PLAYER_EVENT") return null;
    const data = message.data as Record<string, unknown> | undefined;
    if (!data) return null;

    const update: TelemetryUpdate = {};
    const currentTime = numberOrUndefined(data.currentTime);
    const duration = numberOrUndefined(data.duration);
    if (currentTime !== undefined) update.currentTime = currentTime;
    if (duration !== undefined) update.duration = duration;
    if (typeof data.playing === "boolean") update.playing = data.playing;

    return Object.keys(update).length ? update : null;
  }

  // player === 3 (CineSrc)
  if (typeof message.type !== "string" || !message.type.startsWith("cinesrc:")) return null;

  const update: TelemetryUpdate = {};
  const currentTime = numberOrUndefined(message.currentTime);
  const duration = numberOrUndefined(message.duration);
  if (currentTime !== undefined) update.currentTime = currentTime;
  if (duration !== undefined) update.duration = duration;
  if (message.type === "cinesrc:play") update.playing = true;
  if (message.type === "cinesrc:pause") update.playing = false;

  return Object.keys(update).length ? update : null;
}
