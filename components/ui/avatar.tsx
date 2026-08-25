import Image from "next/image";

// Shared avatar-or-initial fallback, extracted from the pattern duplicated
// across comment-reactions-bar.tsx and comments-section.tsx.
export function Avatar({ src, name, size = 32, className = "" }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  const label = (name?.trim() || "?").charAt(0).toUpperCase();

  return src ? (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      loading="eager"
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-foreground/15 font-semibold text-foreground/80 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {label}
    </span>
  );
}
