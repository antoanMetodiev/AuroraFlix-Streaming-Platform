import type { Metadata } from "next";
import { StatusPage } from "@/components/layout/status-page";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Root 404 — reached both by unmatched URLs and by every `notFound()` call
 * in the tree (app/movies/[slug], app/series/[id]). Renders inside the root
 * layout, so the header/nav stay put and the visitor can search their way
 * back instead of hitting a dead end.
 */
export default function NotFound() {
  return <StatusPage code="404" titleKey="status.notFoundTitle" descriptionKey="status.notFoundDesc" />;
}
