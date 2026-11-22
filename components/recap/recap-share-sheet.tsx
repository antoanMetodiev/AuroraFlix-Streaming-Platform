"use client";

import { useEffect, useMemo, useState } from "react";
import { toBlob } from "html-to-image";
import { Check, Copy, Download, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { NETWORK_LABEL, NetworkTile, type ShareNetwork } from "@/components/recap/brand-icons";
import { Spinner } from "@/components/ui/loader";

const SITE_URL = "https://auroraflix.cloud";
const NETWORKS: ShareNetwork[] = ["instagram", "facebook", "whatsapp", "telegram", "reddit"];

/**
 * "Сподели" for the story card on screen: an image of exactly that card
 * (1080×1920, captured from the page) and a message written for it, then
 * Instagram / Facebook / WhatsApp / Telegram / Reddit, copy, or save.
 *
 * On a phone each network goes through the system share sheet with the
 * image attached (the only way a web page can hand an app a picture); on a
 * computer the chat apps get the message as text via their share links, and
 * Instagram (pictures only, no web share) gets the image saved for upload.
 */
export function RecapShareSheet({
  lines,
  capture,
  onClose,
}: {
  /** The card's message, line by line (the site link is added). */
  lines: string[];
  /** The card element to photograph. */
  capture: () => HTMLElement | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => [...lines, "", `${t("recap.shareCta")} ${SITE_URL}`].join("\n"), [lines, t]);

  // Photograph the card once the sheet is up.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    const node = capture();
    if (!node) return;
    toBlob(node, {
      pixelRatio: 1080 / node.offsetWidth,
      cacheBust: true,
      backgroundColor: "#0a0a0a",
      // The story's progress bars and tap zones aren't part of the picture.
      filter: (element) => !(element instanceof HTMLElement && element.dataset.captureSkip !== undefined),
    })
      .then((result) => {
        if (cancelled || !result) return;
        url = URL.createObjectURL(result);
        setBlob(result);
        setPreview(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [capture]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const file = blob ? new File([blob], "auroraflix-week.png", { type: "image/png" }) : null;
  const isPhone = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const canShareFile = Boolean(isPhone && file && navigator.canShare?.({ files: [file] }));

  const save = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "auroraflix-week.png";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const share = async (network: ShareNetwork) => {
    if (canShareFile && file) {
      await navigator.share({ files: [file], text: network === "instagram" ? undefined : text }).catch(() => {});
      return;
    }
    const encoded = encodeURIComponent(text);
    const site = encodeURIComponent(SITE_URL);
    switch (network) {
      case "instagram":
        save();
        setNotice(t("recap.instagramHint"));
        window.open("https://www.instagram.com/", "_blank", "noopener");
        return;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${site}&quote=${encoded}`, "_blank", "noopener,width=640,height=560");
        return;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener");
        return;
      case "telegram":
        window.open(`https://t.me/share/url?url=${site}&text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
        return;
      case "reddit":
        window.open(`https://www.reddit.com/submit?url=${site}&title=${encodeURIComponent(lines[0] ?? "AuroraFlix")}`, "_blank", "noopener");
        return;
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the text is selectable in the bubble
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t("recap.shareThisCard")}>
      <button type="button" aria-label={t("comments.close")} onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="animate-card-in relative max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-surface p-5 sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-foreground">{t("recap.shareThisCard")}</h2>
          <button type="button" onClick={onClose} aria-label={t("comments.close")} className="rounded-full p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex gap-4">
          {/* The picture that will be sent. */}
          <div className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/15 sm:w-32">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob URL
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center text-[0.6875rem] text-foreground/50">
                {failed ? "—" : <Spinner size={22} />}
                {!failed && t("recap.preparing")}
              </div>
            )}
          </div>
          {/* The message that goes with it, as the other person will see it. */}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground/55">{t("recap.shareWillSend")}</p>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl rounded-br-md border border-white/10 bg-[#0b3b2e] p-3 text-[0.8125rem] leading-relaxed whitespace-pre-line text-white select-text">
              {text}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-5 gap-2">
          {NETWORKS.map((network) => (
            <button
              key={network}
              type="button"
              onClick={() => share(network)}
              disabled={network === "instagram" && !blob}
              className="group flex flex-col items-center gap-2 rounded-xl py-1 disabled:opacity-50"
            >
              <NetworkTile network={network} />
              <span className="text-[0.6875rem] font-medium text-foreground/75">{NETWORK_LABEL[network]}</span>
            </button>
          ))}
        </div>

        {notice && <p className="mt-4 rounded-xl bg-white/[0.06] px-3 py-2 text-center text-xs text-foreground/75">{notice}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy}
            className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-neutral-900 transition-colors ${copied ? "bg-emerald-300" : "bg-white"}`}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? t("recap.copied") : t("recap.copyText")}
          </button>
          <button
            type="button"
            onClick={() => {
              save();
              setNotice(t("recap.imageSaved"));
            }}
            disabled={!blob}
            className="flex items-center justify-center gap-2 rounded-full border border-white/15 py-2.5 text-sm font-semibold text-foreground/85 hover:bg-white/10 disabled:opacity-50"
          >
            <Download size={15} />
            {t("recap.download")}
          </button>
        </div>
      </div>
    </div>
  );
}
