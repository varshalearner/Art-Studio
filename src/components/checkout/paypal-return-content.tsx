"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { capturePaypalOrder } from "@/services/payments";
import { createOrder } from "@/services/orders";

/** Finishes a PayPal checkout: captures the approved order, then creates it. */
export function PaypalReturnContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("token");
    const run = async () => {
      try {
        if (!token) throw new Error("Missing PayPal token.");
        const raw = sessionStorage.getItem("aes_pending_checkout");
        if (!raw) throw new Error("Checkout session expired — your PayPal payment may still have gone through; contact support.");
        const pending = JSON.parse(raw);
        const result = await capturePaypalOrder(token);
        const order = await createOrder({
          buyerId: pending.buyerId,
          items: pending.items,
          shippingAddress: pending.address ?? undefined,
          shippingInr: pending.shippingInr,
          subtotalInr: pending.subtotalInr,
          totalInr: pending.totalInr,
          displayCurrency: pending.currency,
          displayTotal: pending.displayTotal,
          paymentProvider: result.provider,
          paymentId: result.paymentId,
        });
        sessionStorage.removeItem("aes_pending_checkout");
        try {
          const { setCartRaw } = await import("@/lib/local/db");
          setCartRaw([]);
        } catch {
          /* noop */
        }
        router.replace(`/checkout/success?order=${order.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not complete the payment.");
      }
    };
    void run();
  }, [params, router]);

  return (
    <div className="container flex flex-col items-center gap-4 py-24 text-center">
      {error ? (
        <>
          <p className="font-display text-xl font-semibold text-destructive">{error}</p>
          <button className="text-primary underline" onClick={() => router.push("/cart")}>
            Back to cart
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Completing your PayPal payment…</p>
        </>
      )}
    </div>
  );
}
