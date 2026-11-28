"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { describeSeriesSources, describeSubtitleSource, type SeriesSourceCounts, type SubtitleKind } from "@/lib/subtitle-source";

/**
 * Whether the signed-in user is the site's admin (asked of the server once
 * per account per page load — /api/admin/me decides). False for everyone
 * else, and while it's being asked; the admin-only UI just doesn't render.
 */
let cached: { userId: string; admin: Promise<boolean> } | null = null;

export function useIsAdmin(): boolean {
  const { isSignedIn, user } = useUser();
  const [admin, setAdmin] = useState(false);
  const userId = isSignedIn ? user?.id : undefined;

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- signed out: no admin tools
      setAdmin(false);
      return;
    }
    if (cached?.userId !== userId) {
      cached = {
        userId,
        admin: fetch("/api/admin/me", { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : { admin: false }))
          .then((data: { admin?: boolean }) => Boolean(data.admin))
          .catch(() => false),
      };
    }
    let cancelled = false;
    cached.admin.then((value) => !cancelled && setAdmin(value));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return admin;
}

export type AdminBadge = { short: string; kind: SubtitleKind; title: string };

/**
 * Admin only: a subtitle-source badge per listed title (catalog cards), by
 * the same id the card uses. Empty for everyone else — nothing is fetched.
 */
export function useAdminSubtitleBadges(type: "movie" | "series", ids: string[], preset?: Record<string, string | SeriesSourceCounts>): Record<string, AdminBadge> {
  const admin = useIsAdmin();
  const [badges, setBadges] = useState<Record<string, AdminBadge>>({});
  const key = ids.join(",");

  useEffect(() => {
    if (!admin || !key) return;
    let cancelled = false;
    const toBadges = (sources: Record<string, string | SeriesSourceCounts>) => {
      const out: Record<string, AdminBadge> = {};
      for (const [id, source] of Object.entries(sources)) {
        if (typeof source === "string") {
          const info = describeSubtitleSource(source);
          if (info) out[id] = { short: info.short, kind: info.kind, title: info.label };
        } else {
          const info = describeSeriesSources(source);
          out[id] = { short: info.short, kind: info.kind, title: info.short };
        }
      }
      return out;
    };
    if (preset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- already known (the admin list's own response)
      setBadges(toBadges(preset));
      return;
    }
    fetch(`/api/admin/subtitle-sources?type=${type}&ids=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : {}))
      .then((sources: Record<string, string | SeriesSourceCounts>) => !cancelled && setBadges(toBadges(sources)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [admin, type, key, preset]);

  return admin ? badges : {};
}
