export function SectionHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-6 flex items-center gap-3 sm:mb-8 ${className}`}>
      <span className="h-6 w-1 shrink-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
      <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{children}</h2>
    </div>
  );
}
