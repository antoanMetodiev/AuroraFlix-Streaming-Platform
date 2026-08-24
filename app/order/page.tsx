import type { Metadata } from "next";
import { OrderSelectPage } from "@/components/order/order-select-page";

export const metadata: Metadata = {
  title: "Order a Title",
  description: "Can't find a movie or series in the AuroraFlix catalog? Request it and we'll add it in seconds.",
};

export default function OrderPage() {
  return <OrderSelectPage />;
}
