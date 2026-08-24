"use client";

import dynamic from "next/dynamic";
import { Loader } from "@/components/ui/loader";

// Server Components (cinema-record-details-page.tsx) dynamically importing a
// Client Component don't actually code-split it — Next.js only honors that
// from within a Client Component (see node_modules/next/dist/docs/01-app/
// 02-guides/lazy-loading.md, "Importing Client Components"). This file is
// the client boundary that makes the split real for the page's heavier,
// below-the-fold sections; ssr stays on (the default) since all three are
// real page content search engines should still see in the initial HTML.
export const LazyCastSection = dynamic(() => import("./cast-section").then((mod) => mod.CastSection), {
  loading: () => <Loader />,
});

export const LazyImageGallery = dynamic(() => import("./image-gallery").then((mod) => mod.ImageGallery));

export const LazyCommentsSection = dynamic(() => import("./comments-section").then((mod) => mod.CommentsSection), {
  loading: () => <Loader />,
});
