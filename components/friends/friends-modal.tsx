"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Users } from "lucide-react";
import { FriendsPanel } from "@/components/friends/friends-panel";
import { useTranslation } from "@/lib/i18n/locale-context";

// Rendered via a portal straight onto document.body — SiteHeader's <header>
// (an ancestor of every trigger this opens from: FriendsNavButton lives
// inside Navigation, inside <header>) has backdrop-blur-xl, and
// backdrop-filter creates a new containing block for fixed-position
// descendants per the CSS spec, same as `filter`/`transform`/`will-change`
// would. Without the portal, this modal's `fixed inset-0` resolves against
// that ~4rem-tall header box instead of the viewport — squashed into a
// sliver at the top instead of covering the screen. z-[60] clears the
// header's own z-40 and every dropdown's z-40/z-50 so this always sits on top.
export function FriendsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    // pb-[10vh] on the flex container biases the centered card upward —
    // "middle of the screen, a bit higher than dead center," per the brief.
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pb-[10vh]" onClick={onClose}>
      <div className="animate-modal-backdrop-in absolute inset-0 bg-black/75 backdrop-blur-md" />
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-modal-card-in relative flex max-h-[78vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-[0_30px_90px_-15px_rgba(0,0,0,0.7)]"
      >
        {/* Soft top glow — purely decorative, gives the panel a bit of depth
            instead of a flat single-tone card. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.06] to-transparent" />

        <div className="relative flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Users size={18} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("friends.title")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("nav.closeMenu")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5 text-foreground/60 transition-all duration-200 hover:scale-105 hover:bg-foreground/10 hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <FriendsPanel />
        </div>
      </div>
    </div>,
    document.body
  );
}
