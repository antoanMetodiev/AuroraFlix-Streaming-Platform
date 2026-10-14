import { useId } from "react";

/** The rating's tone: emerald (great) → lime → amber → rose (poor). */
const TONES = [
  { min: 8, from: "#6ee7b7", to: "#10b981" },
  { min: 6.5, from: "#d9f99d", to: "#84cc16" },
  { min: 5, from: "#fde68a", to: "#f59e0b" },
  { min: 0, from: "#fda4af", to: "#e11d48" },
] as const;

function toneFor(value: number) {
  return TONES.find((tone) => value >= tone.min) ?? TONES[TONES.length - 1];
}

export function getRatingColor(value: number) {
  return toneFor(value).to;
}

const SIZES = {
  xs: { box: 34, stroke: 3, whole: "text-[12px]", decimal: "text-[8px]" },
  sm: { box: 44, stroke: 3.5, whole: "text-[15px]", decimal: "text-[10px]" },
  md: { box: 58, stroke: 4, whole: "text-[20px]", decimal: "text-[12px]" },
} as const;

/**
 * The TMDB rating as a ring: a dark glass disc, a faint full track, and an
 * arc that fills to the score with a two-tone gradient and a soft glow in the
 * rating's colour. The score sits in the middle as "7.8" with the decimal
 * set smaller, so it reads at a glance even at card size.
 */
export function RatingRing({
  value,
  size = "md",
  className = "",
}: {
  value: string | number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const gradientId = useId();
  const numeric = Math.max(0, Math.min(10, Number(value) || 0));
  const tone = toneFor(numeric);
  const { box, stroke, whole, decimal } = SIZES[size];
  const radius = (box - stroke) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const [integer, fraction] = numeric.toFixed(1).split(".");

  // Positioning classes (e.g. "absolute bottom-2.5 right-2.5") go on this
  // wrapper, so the ring inside can stay "relative" for its layers.
  return (
    <div className={`inline-flex shrink-0 rounded-full ${className}`}>
      <div
        className="relative grid place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.16),rgba(0,0,0,0.72)_70%)] text-white ring-1 ring-white/15 backdrop-blur-md"
        style={{ width: box, height: box, boxShadow: `0 4px 14px -2px rgba(0,0,0,0.55), 0 0 18px -6px ${tone.to}` }}
        title={`TMDB: ${numeric.toFixed(1)} / 10`}
        aria-label={`TMDB ${numeric.toFixed(1)} / 10`}
      >
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={tone.from} />
              <stop offset="100%" stopColor={tone.to} />
            </linearGradient>
          </defs>
          <circle cx={box / 2} cy={box / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - numeric / 10)}
            style={{ filter: `drop-shadow(0 0 3px ${tone.to})` }}
          />
        </svg>
        <span className="relative flex items-baseline font-bold tracking-tight tabular-nums">
          <span className={`${whole} leading-none`}>{integer}</span>
          <span className={`${decimal} leading-none text-white/70`}>.{fraction}</span>
        </span>
      </div>
    </div>
  );
}
