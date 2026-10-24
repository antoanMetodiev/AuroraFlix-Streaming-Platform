import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Marks a block of the details page as a stop in <SectionNav>. A plain
 * wrapper (no padding/border), so the section's own margins collapse through
 * it and the layout stays exactly as before.
 */
export function NavSection({
  id,
  label,
  children,
}: {
  id: string;
  label: TranslationKey;
  children: React.ReactNode;
}) {
  return (
    <div id={id} data-nav-section={label} className="scroll-mt-24">
      {children}
    </div>
  );
}
