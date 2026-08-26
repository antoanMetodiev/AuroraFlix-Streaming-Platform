import type { Metadata } from "next";
import { PlaylistsView } from "@/components/playlists/playlists-view";

// Personal collections, some private — nothing here is meaningful to crawl or index.
export const metadata: Metadata = {
  title: "My Playlists",
  robots: { index: false, follow: false },
};

export default function PlaylistsPage() {
  return <PlaylistsView />;
}
