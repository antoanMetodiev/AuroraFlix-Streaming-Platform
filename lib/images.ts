import type { ImageType, MediaImage } from "@/types/media-image";

export function getImagesByType(images: MediaImage[] | undefined, imageType: ImageType, limit?: number) {
  if (!images) return [];
  const filtered = images.filter((image) => image.imageType === imageType);
  return limit === undefined ? filtered : filtered.slice(0, limit);
}
