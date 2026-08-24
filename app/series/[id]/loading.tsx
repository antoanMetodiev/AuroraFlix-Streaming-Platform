import { FullScreenLoader } from "@/components/ui/loader";

// See app/movies/[slug]/loading.tsx — same reasoning for series details.
export default function Loading() {
  return <FullScreenLoader />;
}
