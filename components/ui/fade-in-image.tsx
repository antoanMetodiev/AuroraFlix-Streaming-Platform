import Image, { type ImageProps } from "next/image";

// Plain eager-loaded image — no shimmer placeholder, no fade-in transition.
// Expects to be used the way `fill` images already are: inside a `relative`,
// sized parent.
export function FadeInImage({ className = "", alt, ...props }: ImageProps) {
  return <Image {...props} alt={alt} fill loading="eager" className={className} />;
}
