import type { Metadata } from "next";
import { WeeklyRecapView } from "@/components/recap/weekly-recap-view";

// Personal, built from the viewer's own watch history — nothing to index.
export const metadata: Metadata = {
  title: "My Week",
  robots: { index: false, follow: false },
};

export default function WeekPage() {
  return <WeeklyRecapView />;
}
