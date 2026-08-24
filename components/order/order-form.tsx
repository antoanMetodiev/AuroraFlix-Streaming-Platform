"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { orderMovie, orderSeries } from "@/lib/api-public";
import { getOrderCooldownRemaining, startOrderCooldown } from "@/lib/order";
import { Spinner } from "@/components/ui/loader";
import { useTranslation } from "@/lib/i18n/locale-context";

type Status = "idle" | "sending" | "success" | "error";

export function OrderForm({ type }: { type: "movie" | "series" }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [remaining, setRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Cooldown is persisted in localStorage, so it survives a reload/navigation — only readable client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(getOrderCooldownRemaining());
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = window.setInterval(() => setRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [remaining]);

  const canSubmit = remaining === 0 && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = value.trim();
    if (!title || !canSubmit) return;

    setIsSubmitting(true);
    setStatus("sending");

    const ok = type === "movie" ? await orderMovie(title) : await orderSeries(title);

    setIsSubmitting(false);
    setRemaining(startOrderCooldown());
    setStatus(ok ? "success" : "error");
  };

  const message =
    status === "sending"
      ? t("order.sending")
      : status === "success"
        ? type === "movie"
          ? t("order.successMovies")
          : t("order.successSeries")
        : status === "error"
          ? t("order.error")
          : t("order.idleMessage");

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        {remaining > 0 && (
          <span className="absolute -top-8 right-0 rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground/80 backdrop-blur-md">
            {remaining}s
          </span>
        )}

        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={!canSubmit}
          autoComplete="off"
          type="text"
          name="orderTitle"
          placeholder={type === "movie" ? t("order.placeholderMovie") : t("order.placeholderSeries")}
          className="w-full min-w-0 rounded-full border border-foreground/15 bg-foreground/[0.06] py-3.5 pr-14 pl-6 text-sm text-foreground placeholder:text-foreground/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-300 outline-none focus:border-transparent focus:bg-foreground/[0.1] focus:shadow-[0_0_0_1.5px_#8e2de2,0_8px_28px_-6px_rgba(142,45,226,0.55)] disabled:opacity-50 sm:py-4 sm:text-base"
        />

        <button
          type="submit"
          disabled={!canSubmit || !value.trim()}
          aria-label={t("order.submitAria")}
          className="absolute right-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white transition-transform duration-200 enabled:hover:scale-108 disabled:opacity-40 sm:h-10 sm:w-10"
        >
          {isSubmitting ? <Spinner size={16} /> : <Send size={16} />}
        </button>
      </form>

      <p className="mt-5 text-sm leading-relaxed text-foreground/55">{message}</p>
    </div>
  );
}
