import type { CSSProperties } from "react";

export function getRatingColor(value: number) {
  if (value >= 8) return "#16a34a";
  if (value >= 6.5) return "#65a30d";
  if (value >= 5) return "#f59e0b";
  return "#dc2626";
}

export function RatingRing({
  value,
  size = "md",
  className = "",
}: {
  value: string | number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const numeric = Math.max(0, Math.min(10, Number(value) || 0));
  const color = getRatingColor(numeric);
  const dimension = size === "xs" ? "32px" : size === "sm" ? "40px" : "56px";
  const thickness = size === "xs" ? "3px" : size === "sm" ? "4px" : "5px";

  // Positioning classes (e.g. "absolute bottom-2.5 right-2.5") are applied on this
  // shrink-to-fit wrapper rather than merged into the ring's own class string —
  // the ring needs "relative" for its ::before pseudo-element, and Tailwind's
  // stylesheet order makes "relative" win over an "absolute" passed alongside it
  // regardless of which comes first in the className, so the two can't mix on one element.
  return (
    <div className={`inline-flex rounded-full ${className}`}>
      <div
        className="rating-ring relative grid place-items-center rounded-full bg-black/45 text-white shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
        style={
          {
            "--size": dimension,
            "--thickness": thickness,
            "--pct": `${numeric * 10}%`,
            "--ring-color": color,
          } as CSSProperties
        }
        title={`TMDB: ${numeric.toFixed(1)} / 10`}
      >
        <span className="relative z-10 flex items-center justify-center rounded-full bg-black/55 text-xs font-medium sm:text-sm">
          {numeric.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
