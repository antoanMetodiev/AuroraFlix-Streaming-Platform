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

export type ProgressUpdate = TelemetryUpdate & {
  season?: number | string;
  episode?: number | string;
};

/**
 * Providers whose position can be saved for "continue watching", by their id
 * in PlayerSection. VidLink (4) and VidSpark (6) document their events;
 * EmbedMaster (5) sends {source:"embedmaster_player", event, info} (captured
 * 2026-11-07). The БГ аудио players (7, 8) send nothing, so their position can
 * only be estimated: see useEstimatedProgressRecorder.
 */
export const PROGRESS_ORIGIN: Record<number, string> = {
  ...PLAYER_ORIGIN,
  4: "https://vidlink.pro",
  5: "https://embdmstrplayer.com",
  6: "https://vidspark.to",
};

const EMBEDMASTER_SOURCE = "embedmaster_player";

/** The message EmbedMaster's player takes to jump to a position, in seconds. */
export function embedmasterSeekCommand(seconds: number) {
  return { source: "embedmaster_player_command", command: "seek", value: seconds };
}

/** EmbedMaster has told us it's ready for a seek: it knows the runtime. */
export function isEmbedmasterReady(raw: unknown) {
  const message = raw as Record<string, unknown> | null;
  return message?.source === EMBEDMASTER_SOURCE && message.event === "duration";
}

/** Did this message come from the given provider's player? */
export function isFromProvider(provider: number, event: MessageEvent) {
  // embedmaster.link redirects to a player domain of theirs that may change,
  // so it's told apart by its own marker instead.
  if (provider === 5) return (event.data as Record<string, unknown> | null)?.source === EMBEDMASTER_SOURCE;
  return event.origin === PROGRESS_ORIGIN[provider];
}

function episodeFields(message: Record<string, unknown>): Pick<ProgressUpdate, "season" | "episode"> {
  const fields = (message.data && typeof message.data === "object" ? message.data : message) as Record<string, unknown>;
  const isId = (value: unknown): value is number | string =>
    (typeof value === "number" || typeof value === "string") && value !== "" && Number.isFinite(Number(value));
  return isId(fields.season) && isId(fields.episode) ? { season: fields.season, episode: fields.episode } : {};
}

/** The position (and, when the provider says, the episode) in one message. */
export function extractProgress(provider: number, raw: unknown): ProgressUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const message = raw as Record<string, unknown>;

  if (provider === 3 && message.type === "cinesrc:nextepisode") {
    return episodeFields(message);
  }

  let update: TelemetryUpdate | null = null;
  if (provider === 1 || provider === 2 || provider === 3) {
    update = extractTelemetry(provider, raw);
  } else if (provider === 4) {
    // Same PLAYER_EVENT shape as VidFast.
    update = extractTelemetry(2, raw);
  } else if (provider === 5 && message.source === EMBEDMASTER_SOURCE) {
    const value = numberOrUndefined(message.info);
    if (message.event === "duration") return { duration: value };
    return message.event === "time" || message.event === "seek" ? { currentTime: value } : null;
  } else if (provider === 6 && message.source === "vidspark-player") {
    update = {
      currentTime: numberOrUndefined(message.currentTime),
      duration: numberOrUndefined(message.duration),
    };
  }

  return update ? { ...update, ...episodeFields(message) } : null;
}
