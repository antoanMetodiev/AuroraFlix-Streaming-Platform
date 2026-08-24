import { BlurredBackdrop } from "@/components/ui/blurred-backdrop";

export function ListBackground({ type }: { type: "movies" | "series" }) {
  const src = type === "movies" ? "/movie-background-image.webp" : "/series-background-image.webp";
  return <BlurredBackdrop src={src} />;
}
