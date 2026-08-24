import Image from "next/image";
import Link from "next/link";
import type { MarqueeItem } from "@/lib/data/home-marquee";

export function MarqueeRow({
  items,
  hrefBase,
  direction,
  ariaLabel,
}: {
  items: MarqueeItem[];
  hrefBase: string;
  direction: "left" | "right";
  ariaLabel: string;
}) {
  const doubledItems = [...items, ...items];

  return (
    <div className="group relative overflow-hidden py-2" role="group" aria-label={ariaLabel}>
      <ul
        className={`flex w-max gap-4 pr-4 ${
          direction === "left" ? "animate-marquee" : "animate-marquee-reverse"
        } group-hover:[animation-play-state:paused]`}
      >
        {doubledItems.map((item, index) => (
          <li key={`${item.slug}-${index}`} aria-hidden={index >= items.length}>
            <Link
              href={`${hrefBase}/${item.slug}`}
              tabIndex={index >= items.length ? -1 : 0}
              className="group/card block w-[150px] text-center sm:w-[180px] lg:w-[215px]"
            >
              <div className="relative aspect-2/3 overflow-hidden rounded-2xl shadow-[0_0_22px_rgba(255,255,255,0.2)] transition-transform duration-300 group-hover/card:scale-105 group-hover/card:shadow-[0_8px_32px_rgba(255,255,255,0.4)]">
                <Image
                  src={item.imageSrc}
                  alt={item.title}
                  fill
                  loading="eager"
                  sizes="(min-width: 1024px) 215px, (min-width: 640px) 180px, 150px"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-2 truncate text-sm font-medium tracking-wide text-foreground/85 sm:text-base">
                {item.title}
              </h3>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
