"use client";

import dynamic from "next/dynamic";

// app/page.tsx is a Server Component, so a dynamic import made there doesn't
// actually code-split (see components/movies/details/lazy-sections.tsx for
// the full explanation) — this file is the client boundary that makes it
// real for everything below the hero.
export const LazyPricingSection = dynamic(() => import("./pricing-section").then((mod) => mod.PricingSection));

export const LazyLastViewedSection = dynamic(() => import("./last-viewed-section").then((mod) => mod.LastViewedSection));

export const LazyTrendingSection = dynamic(() => import("./trending-section").then((mod) => mod.TrendingSection));

// Only ever relevant right after a Stripe Checkout redirect — no SEO value,
// purely post-payment client interactivity — so ssr:false skips it entirely
// for the other ~100% of homepage visits.
export const LazyCheckoutResultOverlay = dynamic(
  () => import("@/components/payments/checkout-result-overlay").then((mod) => mod.CheckoutResultOverlay),
  { ssr: false }
);
