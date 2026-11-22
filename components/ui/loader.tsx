"use client";

import { useTranslation } from "@/lib/i18n/locale-context";

export function Spinner({ size = 32, className = "" }: { size?: number; className?: string }) {
  const { t } = useTranslation();

  return (
    <span
      role="status"
      aria-label={t("common.loading")}
      className={`inline-block shrink-0 animate-[spin_0.7s_linear_infinite] rounded-full border-[3px] border-current/20 border-t-current ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Loader({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-24 text-foreground/70 ${className}`}>
      <Spinner size={48} />
      {label && <p className="text-sm tracking-wide">{label}</p>}
    </div>
  );
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 bg-background">
      <Spinner size={56} />
      {label && <p className="text-xs font-medium tracking-[0.2em] text-foreground/50 uppercase">{label}</p>}
    </div>
  );
}
