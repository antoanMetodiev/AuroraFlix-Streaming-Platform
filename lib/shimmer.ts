// A soft, animated shimmer swapped in as next/image's blurDataURL — shown in
// the image's exact spot (matching its rounded corners/aspect ratio) while
// the real poster/photo streams in, instead of a plain empty gap. One fixed
// SVG works for every `fill` image regardless of its actual size, since it's
// just a low-res placeholder Next.js stretches to cover the box.
const SHIMMER_SVG = `
<svg width="700" height="475" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#1a1230" offset="20%" />
      <stop stop-color="#2a1f4d" offset="50%" />
      <stop stop-color="#1a1230" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="700" height="475" fill="#1a1230" />
  <rect id="r" width="700" height="475" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-700" to="700" dur="1.2s" repeatCount="indefinite" />
</svg>`;

const toBase64 = (str: string) => (typeof window === "undefined" ? Buffer.from(str).toString("base64") : window.btoa(str));

export const SHIMMER_BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(SHIMMER_SVG)}`;
