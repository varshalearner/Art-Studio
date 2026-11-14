"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CircleCheck, Download } from "lucide-react";
import { getOrderById } from "@/services/orders";
import { useCurrency } from "@/components/currency-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const { format } = useCurrency();

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId!),
    enabled: !!orderId,
  });

  return (
    <div className="container flex flex-col items-center py-16 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <CircleCheck className="h-20 w-20 text-sage" aria-hidden />
      </motion.div>
      <h1 className="mt-4 font-display text-3xl font-bold" data-testid="order-success">
        Your art is on its way home 🖼️
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The artists have been told to start wrapping. You'll get a notification (and an
        email in live mode) at every step.
      </p>

      {order && (
        <Card className="mt-8 w-full max-w-md text-left">
          <CardContent className="space-y-2 p-5 text-sm">
            <p className="font-semibold">Order {order.id}</p>
            {order.items.map((item) => (
              <div key={item.listingId} className="flex items-center justify-between gap-2">
                <span className="truncate">{item.title} ×{item.qty}</span>
                {item.kind === "digital" && item.downloadUrl ? (
                  <a
                    href={item.downloadUrl}
                    download
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                ) : (
                  <span>{format(item.priceInr * item.qty)}</span>
                )}
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total paid</span>
              <span>{format(order.totalInr)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href={order ? `/account/orders/${order.id}` : "/account/orders"}>Track order</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/shop">Keep browsing</Link>
        </Button>
      </div>
    </div>
  );
}
