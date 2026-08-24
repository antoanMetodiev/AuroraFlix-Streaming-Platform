import type { Metadata } from "next";
import { SubscriptionView } from "@/components/account/subscription-view";

// Personal billing data — nothing here is meaningful to crawl or index.
export const metadata: Metadata = {
  title: "Subscription",
  robots: { index: false, follow: false },
};

export default function SubscriptionPage() {
  return <SubscriptionView />;
}
