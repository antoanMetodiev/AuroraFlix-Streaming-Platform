"use client";

import type { CSSProperties } from "react";

/**
 * A one-shot burst of little particles from the middle of its (relative)
 * parent — for a like, a save, a new playlist. Remount it (change its `key`)
 * to fire again. Pure CSS (.animate-burst in globals.css), gone with reduced
 * motion.
 */
export function Burst({ colors, count = 10, distance = 26, size = 5 }: { colors: string[]; count?: number; distance?: number; size?: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.25 : 0);
        const reach = distance * (i % 2 ? 0.75 : 1);
        return (
          <span
            key={i}
            className="animate-burst absolute rounded-full"
            style={
              {
                width: size,
                height: size,
                background: colors[i % colors.length],
                "--burst-x": `${Math.cos(angle) * reach}px`,
                "--burst-y": `${Math.sin(angle) * reach}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

/** A short tap on phones that support it; silently nothing elsewhere. */
export function hapticTap() {
  try {
    navigator.vibrate?.(12);
  } catch {
    // not allowed here
  }
}
