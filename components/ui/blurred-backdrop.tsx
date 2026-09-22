import Image from "next/image";

export function BlurredBackdrop({ src, overlayOpacity = 0.8 }: { src: string; overlayOpacity?: number }) {
  return (
    <>
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <Image src={src} alt="" fill priority quality={40} sizes="100vw" className="animate-zoom-rotate object-cover blur-[9px]" />
      </div>
      <span className="fixed inset-0 -z-10 bg-background" style={{ opacity: overlayOpacity }} />
    </>
  );
}
