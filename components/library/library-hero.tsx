import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BlurredPageBackdrop } from "@/components/movies/details/details-background";

export type LibraryStat = {
  Icon: LucideIcon;
  label: string;
  value: string;
  /** 0–1: fills a thin bar under the value (e.g. how full the list is). */
  progress?: number;
};

/**
 * The top of the Watchlist and Playlists pages: the blurred poster of the
 * newest title behind the page (same treatment as the details and actor
 * pages), a big gradient title and a row of stat cards in the actor page's
 * style. `action` sits on the title's row (e.g. "New playlist").
 */
export function LibraryHero({
  title,
  subtitle,
  stats,
  action,
  backdropPoster,
}: {
  title: string;
  subtitle: string;
  stats: LibraryStat[];
  action?: ReactNode;
  backdropPoster?: string | null;
}) {
  return (
    <>
      {backdropPoster && <BlurredPageBackdrop src={backdropPoster} />}

      <header className="animate-card-in mb-10 sm:mb-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="bg-gradient-to-b from-white to-white/65 bg-clip-text pb-1 font-display text-4xl leading-[0.95] font-semibold tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-7xl">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/60 sm:text-base">{subtitle}</p>
          </div>
          {action}
        </div>

        {stats.length > 0 && (
          <div className={`mt-8 grid grid-cols-2 gap-3 ${stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
            {stats.map(({ Icon, label, value, progress }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.08]"
              >
                <Icon aria-hidden className="pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 text-white/[0.05] transition-transform duration-500 group-hover:scale-110" />
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-neutral-900 shadow-[0_6px_20px_-6px_rgba(255,255,255,0.5)]">
                  <Icon size={16} />
                </span>
                <p className="mt-3 text-[0.6875rem] font-bold tracking-[0.18em] text-foreground/45 uppercase">{label}</p>
                <p className="mt-0.5 text-lg leading-snug font-bold text-foreground sm:text-xl">{value}</p>
                {progress !== undefined && (
                  <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)] transition-[width] duration-700"
                      style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
