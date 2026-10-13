import type { Metadata } from "next";
import { redirect } from "next/navigation";
// PAYMENTS DISABLED: import { SubscriptionView } from "@/components/account/subscription-view";

// Personal billing data — nothing here is meaningful to crawl or index.
export const metadata: Metadata = {
  title: "Subscription",
  robots: { index: false, follow: false },
};

// PAYMENTS DISABLED — nobody is charged for now, so the page just sends
// visitors home. Restore `return <SubscriptionView />;` to bring it back.
export default function SubscriptionPage() {
  redirect("/");
}
