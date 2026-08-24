"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Next.js's own scroll restoration doesn't reliably land at the top for
// every navigation (e.g. clicking a card far down a long list, or a link in
// the footer) — this guarantees every route change starts scrolled to the
// top. "instant" overrides the site-wide smooth-scroll CSS rule, since this
// should feel like a fresh page, not an animated scroll-up. Mounted once
// from the root layout; renders nothing.
//
// Also keyed on the search params, not just the pathname — pagination and
// the movies/series filters (genre, year, sort, actor, page) only change the
// query string, not the path, so a pathname-only effect would silently skip
// those navigations and leave the scroll wherever it was.
//
// Skipped when the URL carries a hash (e.g. the "Pricing" nav link going to
// "/#pricing" from another page) — that's a deliberate scroll-to-anchor
// navigation, not a fresh page, and forcing the top here would fight with it.
function ScrollToTopInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, query]);

  return null;
}

// useSearchParams() requires a Suspense boundary; fallback is null since the
// real component also renders nothing.
export function ScrollToTopOnNavigate() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopInner />
    </Suspense>
  );
}
