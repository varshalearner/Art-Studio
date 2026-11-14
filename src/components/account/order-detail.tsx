"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Truck } from "lucide-react";
import { getOrderById } from "@/services/orders";
import { useCurrency } from "@/components/currency-context";
import { AccountShell } from "@/components/account/account-shell";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { SmartImage } from "@/components/smart-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export function OrderDetail({ orderId }: { orderId: string }) {
  const { format } = useCurrency();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId),
  });

  return (
    <AccountShell title={`Order ${orderId}`}>
      {isLoading ? null : !order ? (
        <EmptyState title="Order not found" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Items</CardTitle>
                <StatusBadge status={order.status} testId="order-status" />
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.listingId} className="flex items-center gap-3">
                    <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border">
                      <SmartImage src={item.image} alt={item.title} fill className="object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">×{item.qty}</p>
                    </div>
                    {item.kind === "digital" && item.downloadUrl && order.status !== "refunded" ? (
                      <a
                        href={item.downloadUrl}
                        download
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        <Download className="h-4 w-4" /> Download
                      </a>
                    ) : (
                      <span className="text-sm font-semibold">{format(item.priceInr * item.qty)}</span>
                    )}
                  </div>
                ))}
                <div className="space-y-1 border-t pt-3 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{format(order.subtotalInr)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>{format(order.shippingInr)}</span></div>
                  <div className="flex justify-between font-display text-base font-bold">
                    <span>Total</span><span className="text-primary">{format(order.totalInr)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.trackingNumber && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4 text-sm">
                  <Truck className="h-5 w-5 text-sage-dark" />
                  <span>
                    Tracking number: <strong data-testid="tracking-number">{order.trackingNumber}</strong>
                  </span>
                </CardContent>
              </Card>
            )}

            {order.shippingAddress && (
              <Card>
                <CardHeader><CardTitle>Delivery address</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p>{order.shippingAddress.country} · {order.shippingAddress.phone}</p>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground">
              Something wrong? <Link className="text-primary underline" href="/contact">Contact the studio</Link>.
            </p>
          </div>

          <Card className="h-fit">
            <CardHeader><CardTitle>Order timeline</CardTitle></CardHeader>
            <CardContent>
              <Timeline events={order.timeline} />
            </CardContent>
          </Card>
        </div>
      )}
    </AccountShell>
  );
}
