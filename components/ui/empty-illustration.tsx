/**
 * Small line-art illustrations for empty states, drawn in the current text
 * colour (and the title accent, white by default) so they sit on the black
 * theme without any image files. Floats gently unless reduced motion.
 */
export type EmptyIllustrationKind = "search" | "watchlist" | "playlists" | "friends";

export function EmptyIllustration({ kind, className = "" }: { kind: EmptyIllustrationKind; className?: string }) {
  return (
    <div aria-hidden className={`relative animate-empty-float ${className}`}>
      <span className="absolute inset-0 -z-10 m-auto h-3/4 w-3/4 rounded-full bg-white/10 blur-3xl" />
      <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full text-white/80">
        {kind === "search" && <SearchArt />}
        {kind === "watchlist" && <WatchlistArt />}
        {kind === "playlists" && <PlaylistsArt />}
        {kind === "friends" && <FriendsArt />}
        <Sparkle x={22} y={24} />
        <Sparkle x={140} y={30} small />
        <Sparkle x={132} y={98} />
      </svg>
    </div>
  );
}

function Sparkle({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  const r = small ? 3 : 4.5;
  return <path d={`M${x} ${y - r}v${r * 2}M${x - r} ${y}h${r * 2}`} className="animate-pulse text-white/50" stroke="currentColor" strokeWidth="1.6" />;
}

/** An empty film strip under a magnifying glass. */
function SearchArt() {
  return (
    <>
      <rect x="28" y="40" width="80" height="50" rx="6" className="text-white/35" stroke="currentColor" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} className="text-white/35" stroke="currentColor">
          <rect x={34 + i * 15} y="44" width="6" height="5" rx="1" />
          <rect x={34 + i * 15} y="81" width="6" height="5" rx="1" />
        </g>
      ))}
      <circle cx="98" cy="58" r="20" style={{ stroke: "var(--title-accent)" }} />
      <path d="M112 72l18 18" strokeWidth="5" style={{ stroke: "var(--title-accent)" }} />
      <path d="M91 52q7-5 13 1" className="text-white/40" stroke="currentColor" />
    </>
  );
}

/** A bookmark ribbon over a stack of tickets. */
function WatchlistArt() {
  return (
    <>
      <rect x="40" y="56" width="74" height="36" rx="5" transform="rotate(-8 77 74)" className="text-white/30" stroke="currentColor" />
      <rect x="46" y="50" width="74" height="36" rx="5" className="text-white/45" stroke="currentColor" />
      <path d="M58 50v36M108 50v36" strokeDasharray="3 4" className="text-white/40" stroke="currentColor" />
      <path d="M72 20h24v40l-12-8-12 8z" style={{ stroke: "var(--title-accent)" }} />
    </>
  );
}

/** Three stacked cards with a play badge. */
function PlaylistsArt() {
  return (
    <>
      <rect x="52" y="22" width="56" height="12" rx="4" className="text-white/25" stroke="currentColor" />
      <rect x="44" y="34" width="72" height="14" rx="4" className="text-white/40" stroke="currentColor" />
      <rect x="36" y="48" width="88" height="50" rx="7" className="text-white/70" stroke="currentColor" />
      <circle cx="80" cy="73" r="13" style={{ stroke: "var(--title-accent)" }} />
      <path d="M76 66l10 7-10 7z" style={{ stroke: "var(--title-accent)" }} />
    </>
  );
}

/** Two people sharing a popcorn bucket. */
function FriendsArt() {
  return (
    <>
      <circle cx="52" cy="42" r="11" className="text-white/60" stroke="currentColor" />
      <path d="M32 92q2-26 20-26t20 26" className="text-white/60" stroke="currentColor" />
      <circle cx="108" cy="42" r="11" className="text-white/40" stroke="currentColor" strokeDasharray="4 4" />
      <path d="M88 92q2-26 20-26t20 26" className="text-white/40" stroke="currentColor" strokeDasharray="4 4" />
      <path d="M70 70h20l-3 26h-14z" style={{ stroke: "var(--title-accent)" }} />
      <path d="M70 70q2-8 6-4q4-8 8 0q4-4 6 4" style={{ stroke: "var(--title-accent)" }} />
    </>
  );
}
