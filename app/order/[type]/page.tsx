import type { Metadata } from "next";
import { OrderTypePage } from "@/components/order/order-type-page";

const TYPES = ["movie", "series"] as const;
type OrderType = (typeof TYPES)[number];

export function generateStaticParams() {
  return TYPES.map((type) => ({ type }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const label = type === "movie" ? "Movie" : "Series";
  return {
    title: `Order ${label}`,
    description: `Request a ${label.toLowerCase()} that's missing from the AuroraFlix catalog — we'll add it in seconds.`,
  };
}

export default async function OrderTypeRoute({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return <OrderTypePage type={type as OrderType} />;
}
