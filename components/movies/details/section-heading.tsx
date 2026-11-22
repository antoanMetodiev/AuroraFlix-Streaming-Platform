export function SectionHeading({
  children,
  className = "",
  aside,
}: {
  children: React.ReactNode;
  className?: string;
  /** Pushed to the right end of the row, e.g. a carousel's arrows. */
  aside?: React.ReactNode;
}) {
  return (
    <div className={`mb-6 flex items-center gap-3 sm:mb-8 ${className}`}>
      <span className="accent-bar h-6 w-1 shrink-0 rounded-full" />
      <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{children}</h2>
      {aside && <div className="ml-auto flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}
