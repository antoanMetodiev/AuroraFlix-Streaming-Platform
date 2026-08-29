"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { useTranslation } from "@/lib/i18n/locale-context";

/**
 * Signed-in only — the API route itself also enforces this, but hiding the
 * launcher too avoids an unauthenticated visitor opening the panel just to
 * be told "not signed in" on their first message.
 */
export function AssistantLauncher({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!isSignedIn) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("assistant.openAria")}
        title={t("assistant.openAria")}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-foreground/70 backdrop-blur-xl transition-colors hover:bg-foreground/10 hover:text-foreground ${className}`}
      >
        <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        <Sparkles size={17} className="relative" />
      </button>

      {isOpen && <AssistantPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}
