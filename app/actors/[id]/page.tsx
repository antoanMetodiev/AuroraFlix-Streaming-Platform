import type { Metadata } from "next";
import { ActorDetailsView } from "@/components/actor/actor-details-view";

// Actor pages have no backend "get by id" endpoint — data only exists embedded
// in a movie/series castList, so this route is intentionally client-only and
// works only when navigated to from within the app. Not indexed for that reason.
export const metadata: Metadata = {
  title: "Actor",
  robots: { index: false, follow: false },
};

export default async function ActorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ActorDetailsView id={id} />;
}
