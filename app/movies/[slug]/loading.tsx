import { FullScreenLoader } from "@/components/ui/loader";

// A more specific loading.tsx than app/movies/loading.tsx, so it mounts fresh
// (and shows the full-screen loader) on every navigation into a movie's
// details page, regardless of whether the /movies list segment above it was
// already resolved (list → pagination/genre navigations stay quiet on purpose).
export default function Loading() {
  return <FullScreenLoader />;
}
