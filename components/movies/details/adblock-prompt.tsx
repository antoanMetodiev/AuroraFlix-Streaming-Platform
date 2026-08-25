"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useAdblockDetected } from "@/lib/use-adblock-detected";
import { getExtensionInstallTarget, type ExtensionInstallTarget } from "@/lib/extension-install-target";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { Spinner } from "@/components/ui/loader";

// How long the "Opening ..." feedback stays up after the click — purely
// visual. window.open below fires synchronously in the click handler (not
// after this delay), so the real user gesture is preserved and browsers
// won't treat it as a blocked popup.
const OPENING_FEEDBACK_MS = 900;

type SupportedStore = Exclude<ExtensionInstallTarget["store"], "unsupported">;

const MESSAGE_KEY: Record<SupportedStore, TranslationKey> = {
  chrome: "adblock.message.chrome",
  firefox: "adblock.message.firefox",
  appstore: "adblock.message.safari",
  brave: "adblock.message.brave",
};

const OPENING_KEY: Record<SupportedStore, TranslationKey> = {
  chrome: "adblock.opening.chrome",
  firefox: "adblock.opening.firefox",
  appstore: "adblock.opening.safari",
  brave: "adblock.opening.brave",
};

// Chrome/Firefox/Safari are all "add this extension to your current
// browser"; Brave (for Android) is "go get this whole other browser first" —
// different enough action that it gets its own button label instead of
// "Add uBlockOrigin".
const CTA_KEY: Record<SupportedStore, TranslationKey> = {
  chrome: "adblock.cta",
  firefox: "adblock.cta",
  appstore: "adblock.cta",
  brave: "adblock.cta.brave",
};

/**
 * Shown next to the player only when no ad blocker is detected (see
 * useAdblockDetected — this also covers Brave's built-in Shields, so Brave
 * users never see this) AND there's somewhere real to send the click (see
 * getExtensionInstallTarget — this is where Android Chrome, which can't
 * install extensions at all, gets pointed at Brave instead, since Brave
 * blocks ads by default with no extra setup; only truly dead-end cases hide
 * the prompt entirely).
 *
 * These free embeds (vidsrc/vidfast/cinesrc) carry pop-up/redirect ads that
 * nothing on our end can filter out (see PlayerSection), so pointing viewers
 * at a real ad blocker is the one thing that actually helps. Re-checks fresh
 * on every visit — see the `dismissed` state below for why closing it isn't
 * permanent.
 */
export function AdblockPrompt() {
  const { t } = useTranslation();
  const hasAdblock = useAdblockDetected();
  // Not persisted anywhere on purpose — whether this shows is driven entirely
  // by the live check on each visit. Dismissing only hides it for the page
  // you're currently on; it comes right back next time an ad blocker still
  // isn't detected, instead of staying gone forever after one click.
  const [dismissed, setDismissed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  if (hasAdblock !== false || dismissed) return null;

  const target = getExtensionInstallTarget();
  if (target.store === "unsupported") return null;

  const dismiss = () => setDismissed(true);

  const handleInstallClick = () => {
    // Opened synchronously, inside the click handler, so it stays tied to the
    // user gesture and the browser won't treat it as a blocked popup — the
    // "opening..." state below is just feedback layered on top, not a delay
    // before the real thing happens.
    window.open(target.url, "_blank", "noopener,noreferrer");
    setIsOpening(true);
    window.setTimeout(() => setIsOpening(false), OPENING_FEEDBACK_MS);
  };

  return (
    <div className="relative mt-4 flex w-full max-w-[80rem] flex-col items-start gap-4 rounded-2xl border border-foreground/10 bg-surface p-5 shadow-[0_15px_30px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 pr-6 sm:pr-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
          <ShieldCheck className="h-5 w-5 text-neutral-900" />
        </span>
        <p className="text-sm leading-relaxed text-foreground/80">{t(MESSAGE_KEY[target.store])}</p>
      </div>

      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isOpening}
        className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-center text-sm font-semibold text-neutral-900 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-80 sm:w-auto"
      >
        {isOpening && <Spinner size={16} />}
        {isOpening ? t(OPENING_KEY[target.store]) : t(CTA_KEY[target.store])}
      </button>

      <button
        type="button"
        onClick={dismiss}
        aria-label={t("adblock.dismissAria")}
        className="absolute top-4 right-4 text-foreground/40 transition-colors duration-200 hover:text-foreground sm:static sm:self-start"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
