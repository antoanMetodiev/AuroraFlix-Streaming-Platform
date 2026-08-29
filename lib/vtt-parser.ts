export type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

const TIMESTAMP_PATTERN =
  /(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/;

function parseTimestamp(raw: string): number | null {
  const match = raw.match(TIMESTAMP_PATTERN);

  if (!match) {
    return null;
  }

  const hours = match[1] ? Number(match[1].replace(":", "")) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);

  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/**
 * Minimal WebVTT (and SRT) cue parser — good enough to drive a self-timed
 * overlay. It ignores cue settings (position/align/etc.) and styling blocks,
 * keeping only the plain text of each cue.
 */
export function parseSubtitles(raw: string): SubtitleCue[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split("\n\n");
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim() !== "");

    if (!lines.length) {
      continue;
    }

    const timingLineIndex = lines.findIndex((line) => line.includes("-->"));

    if (timingLineIndex === -1) {
      continue;
    }

    const [startRaw, endRaw] = lines[timingLineIndex].split("-->");
    const start = startRaw ? parseTimestamp(startRaw.trim()) : null;
    const end = endRaw ? parseTimestamp(endRaw.trim()) : null;

    if (start === null || end === null) {
      continue;
    }

    const text = lines
      .slice(timingLineIndex + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!text) {
      continue;
    }

    cues.push({ start, end, text });
  }

  return cues.sort((a, b) => a.start - b.start);
}

export function findActiveCue(
  cues: SubtitleCue[],
  timeSeconds: number
): SubtitleCue | null {
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const cue = cues[mid];

    if (timeSeconds < cue.start) {
      high = mid - 1;
    } else if (timeSeconds > cue.end) {
      low = mid + 1;
    } else {
      return cue;
    }
  }

  return null;
}
