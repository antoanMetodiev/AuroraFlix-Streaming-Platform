import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CinemaRecordDetailsPage } from "@/components/movies/cinema-record-details-page";
import { getSeriesDetails } from "@/lib/api";
import { jsonLdHtml, recordJsonLd, recordMetadata } from "@/lib/seo";

// cache(): generateMetadata and the page below both need the series — one
// backend call per request instead of two.
const loadSeries = cache((id: string) => getSeriesDetails(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const series = await loadSeries(id);
  if (!series) return { title: "Сериалът не е намерен", robots: { index: false } };

  return recordMetadata(series, "series", `/series/${series.tmdbId || id}`);
}

export default async function SeriesDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await loadSeries(id);
  if (!series) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(recordJsonLd(series, "series", `/series/${series.tmdbId || id}`))}
      />
      <CinemaRecordDetailsPage record={series} type="series" />
    </>
  );
}
