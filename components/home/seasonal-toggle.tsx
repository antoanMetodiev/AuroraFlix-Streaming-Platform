"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { readSeasonalFx, writeSeasonalFx } from "@/lib/seasons";
import { useTranslation } from "@/lib/i18n/locale-context";

/** Switches the homepage's seasonal particles (SeasonalEffects) on/off; remembered per browser. */
export function SeasonalToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved choice only exists in the browser
    setOn(readSeasonalFx());
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        setOn(!on);
        writeSeasonalFx(!on);
      }}
      className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <Sparkles size={13} />
      {t(on ? "seasonal.fxOff" : "seasonal.fxOn")}
    </button>
  );
}
