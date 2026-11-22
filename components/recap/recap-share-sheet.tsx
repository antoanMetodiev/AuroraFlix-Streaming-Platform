"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { WeeklyRecap } from "@/lib/weekly-recap";
import { renderRecapImage } from "@/components/recap/recap-image";

const SITE_URL = "https://auroraflix.cloud";

/**
 * "Сподели": shows exactly what will be sent (as a chat bubble), lets the
 * viewer choose whether the titles are named, then hands it to an app
 * (WhatsApp, Viber, Telegram, Facebook), copies it, or saves the 1080×1920
 * story image. Same message as the mobile app's share sheet.
 */
export function RecapShareSheet({
  recap,
  range,
  timeText,
  genres,
  images,
  onClose,
}: {
  recap: WeeklyRecap;
  range: string;
  timeText: string;
  genres: string[];
  images: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [withTitles, setWithTitles] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = useMemo(() => {
    const top = recap.titles[0];
    const series = recap.series[0];
    return [
      `🎬 ${t("recap.shareHeader")} (${range})`,
      "",
      `⏱ ${timeText} · ${recap.activeDays}/7 ${t("recap.statDays")}`,
      `🍿 ${t("recap.titlesTitle", { count: recap.titles.length })} (${t("nav.movies")}: ${recap.movies.length} · ${t("sections.episodes")}: ${recap.episodesWatched})`,
      ...(withTitles && top ? [`🏆 ${t("recap.shareTop")}: ${top.title}`] : []),
      ...(withTitles && series && series.episodes.length > 1
        ? [`📺 ${t("recap.shareSeries")}: ${series.title} (${t("recap.episodesCount", { count: series.episodes.length })})`]
        : []),
      ...(genres.length ? [`🎭 ${genres.slice(0, 2).join(" · ")}`] : []),
      ...(recap.streak > 1 ? [`🔥 ${t("recap.streak", { n: recap.streak })}`] : []),
      "",
      `${t("recap.shareCta")} ${SITE_URL}`,
    ].join("\n");
  }, [recap, range, timeText, genres, withTitles, t]);

  const encoded = encodeURIComponent(text);
  const targets = [
    { label: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${encoded}` },
    { label: "Viber", color: "#7360F2", href: `viber://forward?text=${encoded}` },
    { label: "Telegram", color: "#29A9EB", href: `https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encoded}` },
    { label: "Facebook", color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the text is selectable in the bubble
    }
  };

  const image = async () => {
    setBusy(true);
    try {
      return await renderRecapImage({
        range,
        heading: t("recap.subtitle"),
        lines: text
          .split("\n")
          .filter((line) => line && !line.startsWith("🎬") && !line.includes(SITE_URL)),
        images: withTitles ? images : [],
      });
    } finally {
      setBusy(false);
    }
  };

  const saveImage = async () => {
    const blob = await image();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "auroraflix-week.png";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  const nativeShare = async () => {
    const blob = await image();
    const file = blob ? new File([blob], "auroraflix-week.png", { type: "image/png" }) : null;
    const data: ShareData = file && navigator.canShare?.({ files: [file] }) ? { files: [file], text } : { text };
    await navigator.share(data).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t("recap.shareSheetTitle")}>
      <button type="button" aria-label={t("comments.close")} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="animate-card-in relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-surface p-5 sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">{t("recap.shareSheetTitle")}</h2>
            <p className="mt-1 text-sm text-foreground/55">{t("recap.shareWillSend")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("comments.close")} className="rounded-full p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* The message itself, as the other person will see it. */}
        <div className="mt-4 rounded-2xl rounded-br-md border border-white/10 bg-[#0b3b2e] p-4 text-sm leading-relaxed whitespace-pre-line text-white select-text">
          {text}
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80">
          <input type="checkbox" checked={withTitles} onChange={(event) => setWithTitles(event.target.checked)} className="h-4 w-4 accent-white" />
          {t("recap.includeTitles")}
        </label>

        <p className="mt-5 text-xs font-bold tracking-wider text-foreground/45 uppercase">{t("recap.shareVia")}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {targets.map((target) => (
            <a
              key={target.label}
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ borderColor: `${target.color}80`, background: `${target.color}2e` }}
            >
              {target.label}
            </a>
          ))}
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
            >
              <Share2 size={14} />
              {t("recap.moreApps")}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={copy}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-neutral-900 transition-colors ${copied ? "bg-emerald-300" : "bg-white"}`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t("recap.copied") : t("recap.copyText")}
        </button>

        <p className="mt-4 text-xs text-foreground/50">{t("recap.imageNote")}</p>
        <button
          type="button"
          onClick={saveImage}
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2.5 text-sm font-semibold text-foreground/85 hover:bg-white/10 disabled:opacity-60"
        >
          <Download size={15} />
          {t("recap.download")}
        </button>
      </div>
    </div>
  );
}
