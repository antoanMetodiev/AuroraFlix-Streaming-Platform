import Image, { type ImageProps } from "next/image";

// Plain image — no shimmer placeholder, no fade-in transition. Loads eagerly
// by default; pass loading="lazy" for images below the fold (it is honoured,
// not overridden). Expects to be used the way `fill` images already are:
// inside a `relative`, sized parent.
export function FadeInImage({ className = "", alt, ...props }: ImageProps) {
  return <Image loading="eager" {...props} alt={alt} fill className={className} />;
}
