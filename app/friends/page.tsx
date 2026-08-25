import type { Metadata } from "next";
import { FriendsView } from "@/components/friends/friends-view";

// Personal, per-account data — nothing here is meaningful to crawl or index.
export const metadata: Metadata = {
  title: "Friends",
  robots: { index: false, follow: false },
};

export default function FriendsPage() {
  return <FriendsView />;
}
