"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { useWatchProgress, useWatchProgressReady } from "@/lib/watch-progress";
import { weeklyRecap } from "@/lib/weekly-recap";

/** Homepage link to /week — only once there's something in this week's recap. */
export function RecapPill() {
  const { t } = useTranslation();
  const progress = useWatchProgress();
  const ready = useWatchProgressReady();
  const count = useMemo(() => (ready ? weeklyRecap(progress).titles.length : 0), [progress, ready]);
  if (count === 0) return null;

  return (
    <div className="flex justify-center px-4 pt-6">
      <Link
        href="/week"
        className="group animate-card-in flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] py-2 pr-3 pl-4 text-sm font-semibold text-foreground/90 shadow-[0_0_24px_-8px_rgba(167,139,250,0.6)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/[0.12]"
      >
        <Sparkles size={15} className="text-violet-300" />
        {t("recap.homePill")}
        <ChevronRight size={15} className="text-foreground/50 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
