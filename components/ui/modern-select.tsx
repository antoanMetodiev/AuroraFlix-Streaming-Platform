"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type ModernSelectOption = { value: string; label: string };

/**
 * A "select" in behavior (closed trigger showing the current value, click to
 * reveal the list, pick one, closes) but fully custom-rendered — a native
 * <select>'s dropdown panel is OS-drawn and can't take rounded corners,
 * blur, gradients, or a selected-state checkmark no matter what CSS you
 * throw at it. This gets all of that while staying keyboard/outside-click
 * dismissible like a real one.
 */
export function ModernSelect({
  value,
  options,
  onChange,
  className = "",
}: {
  value: string;
  options: ModernSelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activeLabel = options.find((option) => option.value === value)?.label ?? "";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide backdrop-blur-md transition-all duration-300 sm:px-5 sm:text-sm ${
          open
            ? "border-transparent bg-linear-to-br from-[#6c5ce7] to-[#8e44ad] text-white shadow-[0_4px_24px_-4px_rgba(142,69,231,0.7)]"
            : "border-foreground/10 bg-foreground/5 text-foreground/85 hover:border-foreground/25 hover:bg-foreground/10 hover:text-foreground"
        }`}
      >
        {activeLabel}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        role="listbox"
        className={`absolute right-0 z-20 mt-2 max-h-80 min-w-full origin-top-right overflow-y-auto rounded-2xl border border-foreground/10 bg-surface p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-200 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-left text-xs font-medium whitespace-nowrap transition-colors duration-150 sm:text-sm ${
                isActive
                  ? "bg-linear-to-br from-[#6c5ce7]/25 to-[#8e44ad]/25 text-white"
                  : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
              }`}
            >
              {option.label}
              {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-[#b794f6]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
