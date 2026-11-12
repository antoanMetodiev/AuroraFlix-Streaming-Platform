"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * The blurred page background's image, faded in once it has actually
 * loaded instead of popping in half-decoded: it rises from black while
 * gently settling from a slight zoom. Only opacity and transform animate
 * (both GPU-composited) — never the blur itself, which big screens choke on.
 */
export function BackdropImage({ src }: { src: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Image
      src={src}
      alt=""
      fill
      unoptimized
      sizes="100vw"
      onLoad={() => setIsLoaded(true)}
      // scale-110 (the resting state) pushes the blur's soft, see-through edges off-screen.
      className={`object-cover blur-md transition-[opacity,transform] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isLoaded ? "scale-110 opacity-100" : "scale-[1.18] opacity-0"
      }`}
    />
  );
}
