import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CinemaRecordDetailsPage } from "@/components/movies/cinema-record-details-page";
import { getSeriesDetails } from "@/lib/api";
import { tmdbImage } from "@/lib/tmdb";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const series = await getSeriesDetails(id);
  if (!series) return { title: "Series not found" };

  const backdrop = tmdbImage(series.backgroundImg_URL, "w1280");

  return {
    title: series.title,
    description: series.description ?? `Watch ${series.title} on AuroraFlix.`,
    openGraph: {
      title: series.title,
      description: series.description ?? undefined,
      images: backdrop ? [{ url: backdrop }] : undefined,
    },
  };
}

export default async function SeriesDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeriesDetails(id);
  if (!series) notFound();

  return <CinemaRecordDetailsPage record={series} type="series" />;
}
