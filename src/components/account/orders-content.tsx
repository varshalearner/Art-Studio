"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useLocale } from "next-intl";
import { listMyOrders } from "@/services/orders";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { AccountShell } from "@/components/account/account-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { SmartImage } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export function OrdersContent() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const locale = useLocale();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: () => listMyOrders(user!.id),
    enabled: !!user,
  });

  return (
    <AccountShell title="My Orders">
      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-mustard-dark" />}
          title="No orders yet"
          text="When you buy art it shows up here with a little tracking timeline."
          action={<Button asChild><Link href="/shop">Browse the gallery</Link></Button>}
        />
      ) : (
        <div className="space-y-4" data-testid="orders-list">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-cozy card-lift"
            >
              <div className="flex -space-x-3">
                {order.items.slice(0, 3).map((item) => (
                  <span key={item.listingId} className="relative h-14 w-11 overflow-hidden rounded-md border-2 border-card shadow">
                    <SmartImage src={item.image} alt="" fill className="object-cover" />
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {order.items.map((i) => i.title).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.createdAt, locale)} · {order.items.length} item(s)
                </p>
              </div>
              <StatusBadge status={order.status} />
              <p className="font-semibold text-primary">{format(order.totalInr)}</p>
            </Link>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
