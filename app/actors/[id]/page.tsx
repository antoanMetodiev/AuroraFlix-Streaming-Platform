import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActorDetailsView } from "@/components/actor/actor-details-view";
import { getActor, getActorLatestWorks } from "@/lib/api";
import { actorJsonLd, actorMetadata, jsonLdHtml } from "@/lib/seo";

// Two kinds of actor URL:
//  - /actors/{imdbId} ("nm4151189") — rendered here on the server from the
//    gateway's GET /actor/{imdbId} + /actor/latest-works/{imdbId}, so it works
//    on a direct visit and is indexable (see actorIsIndexable). Cast cards link
//    here whenever the actor has an IMDb id.
//  - /actors/{id} (our internal uuid) — for cast members without an IMDb id:
//    there is nothing to look them up by, so the page stays client-only (the
//    actor is handed over through sessionStorage, lib/actor-session.ts), works
//    only when opened from a cast list, and is never indexed.
const IMDB_ID = /^nm\d+$/;

// cache(): generateMetadata and the page below both need the actor — one
// backend call each per request instead of two.
const loadActor = cache(async (imdbId: string) => {
  const [actor, works] = await Promise.all([getActor(imdbId), getActorLatestWorks(imdbId)]);
  return actor?.nameInRealLife ? { actor, works } : null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!IMDB_ID.test(id)) return { title: "Actor", robots: { index: false, follow: false } };

  const data = await loadActor(id);
  if (!data) return { title: "Актьорът не е намерен", robots: { index: false } };
  return actorMetadata(data.actor, data.works, `/actors/${id}`);
}

export default async function ActorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IMDB_ID.test(id)) return <ActorDetailsView id={id} />;

  const data = await loadActor(id);
  if (!data) notFound();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(actorJsonLd(data.actor, `/actors/${id}`))} />
      <ActorDetailsView id={id} initialActor={data.actor} initialWorks={data.works} />
    </>
  );
}
