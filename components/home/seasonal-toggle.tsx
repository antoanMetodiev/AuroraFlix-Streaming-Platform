"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { activeSeason, readSeasonalFx, writeSeasonalFx } from "@/lib/seasons";
import { useTranslation } from "@/lib/i18n/locale-context";

/**
 * Switches the homepage's seasonal particles (SeasonalEffects) on/off;
 * remembered per browser. Only shown while a season is on (same check as
 * SeasonalEffects, ?season= included). Icon-only on phones, where it shares
 * a row with the "Your week" pill.
 */
export function SeasonalToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState(true);
  const [inSeason, setInSeason] = useState(false);

  useEffect(() => {
    // The saved choice and the visitor's date only exist in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(readSeasonalFx());
    setInSeason(activeSeason(new Date(), new URLSearchParams(window.location.search).get("season")) !== null);
  }, []);

  if (!inSeason) return null;
  const label = t(on ? "seasonal.fxOff" : "seasonal.fxOn");

  return (
    <button
      type="button"
      onClick={() => {
        setOn(!on);
        writeSeasonalFx(!on);
      }}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-2.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground sm:px-3"
    >
      <Sparkles size={13} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
