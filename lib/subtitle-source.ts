/**
 * Reads where a Bulgarian subtitle came from out of its subtitle_text_url
 * (the subtitles services' column) — for the admin's view only. Labels are
 * Bulgarian: it's the owner's tool.
 *
 *   machine-translation:llm-claude/opensubtitles/<id>   our Claude translation of an OpenSubtitles EN file
 *   machine-translation:opensubtitles-ai/<id>           OpenSubtitles' own AI translation
 *   cam:<url>                                           a human translation of a cinema rip
 *   <url>                                               a provider's file (by host)
 */
export type SubtitleKind = "machine" | "cam" | "provider";
export type SubtitleSourceFilter = SubtitleKind;

export type SubtitleSourceInfo = {
  kind: SubtitleKind;
  /** Short, for a card badge. */
  short: string;
  /** Full, for the player. */
  label: string;
  /** The raw value, for a tooltip / copy. */
  raw: string;
};

const PROVIDER_HOSTS: [RegExp, string][] = [
  [/opensubtitles\.(com|org)$/, "OpenSubtitles"],
  [/(^|\.)subdl\.com$/, "Subdl"],
  [/vidmoly\./, "Vidmoly"],
  [/subs\.sab\.bz$/, "SubsSab"],
  [/subsunacs\./, "Subsunacs"],
  [/yavka\./, "Yavka"],
  [/vsichkifilmi/, "ВсичкиФилми"],
  [/addic7ed\./, "Addic7ed"],
  [/podnapisi\./, "Podnapisi"],
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

function providerName(url: string): { name: string; known: boolean } {
  const host = hostOf(url);
  for (const [pattern, name] of PROVIDER_HOSTS) if (pattern.test(host)) return { name, known: true };
  return { name: host, known: false };
}

export function describeSubtitleSource(raw: string | null | undefined): SubtitleSourceInfo | null {
  if (raw === null || raw === undefined) return null;
  const value = raw.trim();
  if (value.startsWith("machine-translation:")) {
    const rest = value.slice("machine-translation:".length);
    const [engine, from, id] = rest.split("/");
    if (engine === "llm-claude") {
      return {
        kind: "machine",
        short: "МП · Claude",
        label: `Машинен превод · Claude (от английски субтитри${from ? ` в ${from === "opensubtitles" ? "OpenSubtitles" : from}` : ""}${id ? ` #${id}` : ""})`,
        raw: value,
      };
    }
    if (engine === "opensubtitles-ai") {
      return { kind: "machine", short: "МП · OS AI", label: `Машинен превод · AI на OpenSubtitles${from ? ` #${from}` : ""}`, raw: value };
    }
    return { kind: "machine", short: `МП · ${engine}`, label: `Машинен превод · ${rest}`, raw: value };
  }
  if (value.startsWith("cam:")) {
    const { name } = providerName(value.slice(4));
    return { kind: "cam", short: `CAM · ${name}`, label: `Човешки превод на CAM запис · ${name}`, raw: value };
  }
  if (!value) return { kind: "provider", short: "Доставчик", label: "Доставчик (без адрес)", raw: value };
  const { name, known } = providerName(value);
  return {
    kind: "provider",
    short: known ? name : "CDN плейър",
    label: known ? `Доставчик · ${name}` : `Доставчик · CDN на плейър (${name})`,
    raw: value,
  };
}

/** A series' subtitled episodes by kind (the series service's admin counts). */
export type SeriesSourceCounts = { machine: number; cam: number; provider: number };

export function describeSeriesSources(counts: SeriesSourceCounts): { short: string; kind: SubtitleKind } {
  const parts = [
    counts.machine ? `МП ${counts.machine}` : "",
    counts.provider ? `Дост. ${counts.provider}` : "",
    counts.cam ? `CAM ${counts.cam}` : "",
  ].filter(Boolean);
  const kind: SubtitleKind = counts.machine >= counts.provider && counts.machine >= counts.cam ? "machine" : counts.cam > counts.provider ? "cam" : "provider";
  return { short: parts.join(" · ") || "—", kind };
}
