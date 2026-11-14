"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { listAllOrders, refundOrder } from "@/services/admin";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export function AdminOrders() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: listAllOrders });

  if (!user) return <AdminShell title="Orders">{null}</AdminShell>;

  return (
    <AdminShell title="Orders & refunds">
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{o.items.map((i) => i.title).join(", ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.id} · {formatDate(o.createdAt, locale)} · via {o.paymentProvider}
                  </p>
                </div>
                <StatusBadge status={o.status} />
                <span className="font-semibold">{format(o.totalInr)}</span>
                {["paid", "shipped", "delivered"].includes(o.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await refundOrder(o.id, { id: user.id, name: user.name }, "Refunded by studio admin");
                      toast.success("Order refunded.");
                      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Refund
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
