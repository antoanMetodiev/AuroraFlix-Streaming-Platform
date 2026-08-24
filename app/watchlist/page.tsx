import type { Metadata } from "next";
import { WatchlistView } from "@/components/watchlist/watchlist-view";

// Personal, localStorage-only data — nothing here is meaningful to crawl or index.
export const metadata: Metadata = {
  title: "My Watchlist",
  robots: { index: false, follow: false },
};

export default function WatchlistPage() {
  return <WatchlistView />;
}
