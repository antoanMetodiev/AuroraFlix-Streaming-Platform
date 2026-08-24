"use client";

import { Footer } from "@/components/layout/footer";
import { OrderForm } from "@/components/order/order-form";
import { useTranslation } from "@/lib/i18n/locale-context";

export function OrderTypePage({ type }: { type: "movie" | "series" }) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <div className="relative">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {type === "movie" ? t("order.orderMovie") : t("order.orderSeries")}
          </h1>
          <div className="mt-10 flex w-full justify-center">
            <OrderForm type={type} />
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
