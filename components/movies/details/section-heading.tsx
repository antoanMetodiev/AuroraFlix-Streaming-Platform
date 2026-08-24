export function SectionHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-6 flex items-center gap-3 sm:mb-8 ${className}`}>
      <span className="h-6 w-1 shrink-0 rounded-full bg-linear-to-b from-[#4a00e0] to-[#8e2de2] shadow-[0_0_12px_rgba(142,45,226,0.6)]" />
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{children}</h2>
    </div>
  );
}
