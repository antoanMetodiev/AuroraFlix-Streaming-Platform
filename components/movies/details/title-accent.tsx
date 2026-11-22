"use client";

import { useEffect } from "react";

/**
 * Gives a title's details page its own accent colour, taken from its poster:
 * the poster's most prominent vivid hue, lifted to a brightness that reads on
 * black. Written to --title-accent on <html> (a registered <color> property —
 * see globals.css — so it fades in instead of snapping) and dropped again on
 * leaving the page, which fades everything back to the default white.
 *
 * Everything that uses it falls back to white, so a poster that fails to load
 * or has no real colour (black & white, all grey) just keeps today's look.
 */
export function TitleAccent({ posterURL }: { posterURL: string | null }) {
  useEffect(() => {
    if (!posterURL) return;
    let cancelled = false;
    const root = document.documentElement;
    const image = new Image();
    // TMDB's image CDN sends Access-Control-Allow-Origin: *, so the canvas stays readable.
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      const accent = pickAccent(image);
      if (!accent) return;
      root.style.setProperty("--title-accent", accent);
      root.style.setProperty("--title-tint", accent);
    };
    image.src = posterURL;
    return () => {
      cancelled = true;
      root.style.removeProperty("--title-accent");
      root.style.removeProperty("--title-tint");
    };
  }, [posterURL]);

  return null;
}

const HUE_BUCKETS = 18;

function pickAccent(image: HTMLImageElement): string | null {
  const width = 24;
  const height = 36;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  let data: Uint8ClampedArray;
  try {
    context.drawImage(image, 0, 0, width, height);
    data = context.getImageData(0, 0, width, height).data;
  } catch {
    return null; // tainted canvas — no CORS after all
  }

  // Hue histogram weighted by how colourful each pixel is, so a big grey sky
  // loses to a smaller patch of real colour.
  const weight = new Array<number>(HUE_BUCKETS).fill(0);
  const sumSin = new Array<number>(HUE_BUCKETS).fill(0);
  const sumCos = new Array<number>(HUE_BUCKETS).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.25 || l < 0.12 || l > 0.9) continue;
    const w = s * (1 - Math.abs(l - 0.5));
    const bucket = Math.min(HUE_BUCKETS - 1, Math.floor((h / 360) * HUE_BUCKETS));
    weight[bucket] += w;
    sumSin[bucket] += Math.sin((h * Math.PI) / 180) * w;
    sumCos[bucket] += Math.cos((h * Math.PI) / 180) * w;
  }

  let best = 0;
  for (let b = 1; b < HUE_BUCKETS; b++) if (weight[b] > weight[best]) best = b;
  // Too little colour on the whole poster to call it anything.
  if (weight[best] < (width * height) * 0.02) return null;

  const hue = ((Math.atan2(sumSin[best], sumCos[best]) * 180) / Math.PI + 360) % 360;
  return `hsl(${Math.round(hue)} 80% 62%)`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}
