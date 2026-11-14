import type { Order } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapOrder } from "@/lib/supabase/mappers";
import { nowIso } from "@/lib/utils";
import { push as notify } from "@/services/notifications/supabase";
import { siteConfig } from "@/config";
import type { NewOrderInput } from "./local";
export type { NewOrderInput };

export async function create(input: NewOrderInput): Promise<Order> {
  const now = nowIso();
  const { data, error } = await getSupabase()
    .from("orders")
    .insert({
      buyer_id: input.buyerId,
      items: input.items,
      shipping_address: input.shippingAddress ?? null,
      shipping_inr: input.shippingInr,
      subtotal_inr: input.subtotalInr,
      total_inr: input.totalInr,
      display_currency: input.displayCurrency,
      display_total: input.displayTotal,
      commission_percent: siteConfig.platformCommissionPercent,
      status: "paid",
      payment_provider: input.paymentProvider,
      payment_id: input.paymentId ?? null,
      timeline: [
        { status: "placed", at: now },
        { status: "paid", at: now, note: `Paid via ${input.paymentProvider}` },
      ],
    })
    .select()
    .single();
  if (error) throw error;
  const order = mapOrder(data);
  for (const item of order.items) {
    await notify({
      userId: item.sellerId,
      type: "order_status",
      title: "You made a sale! 🎉",
      body: `'${item.title}' was just purchased.`,
      href: "/sell?tab=orders",
    });
  }
  return order;
}

export async function listMine(buyerId: string): Promise<Order[]> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function listSales(sellerId: string): Promise<Order[]> {
  // seller_ids column maintained by trigger for RLS + querying
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .contains("seller_ids", [sellerId])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function getById(id: string): Promise<Order | null> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

async function updateStatus(
  id: string,
  patch: Record<string, unknown>,
  event: { status: string; note?: string }
): Promise<Order> {
  const current = await getById(id);
  if (!current) throw new Error("Order not found");
  const { data, error } = await getSupabase()
    .from("orders")
    .update({
      ...patch,
      timeline: [...current.timeline, { ...event, at: nowIso() }],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapOrder(data);
}

export async function markShipped(id: string, trackingNumber: string): Promise<Order> {
  const order = await updateStatus(
    id,
    { status: "shipped", tracking_number: trackingNumber },
    { status: "shipped", note: `Tracking: ${trackingNumber}` }
  );
  await notify({
    userId: order.buyerId,
    type: "order_status",
    title: "Your order has shipped 📦",
    body: `Tracking number: ${trackingNumber}`,
    href: `/account/orders/${order.id}`,
  });
  return order;
}

export async function markDelivered(id: string): Promise<Order> {
  const order = await updateStatus(id, { status: "delivered" }, { status: "delivered" });
  await notify({
    userId: order.buyerId,
    type: "order_status",
    title: "Order delivered 🖼️",
    body: "Enjoy your new art! You can now leave a review.",
    href: `/account/orders/${order.id}`,
  });
  return order;
}

export function subscribeOrders(cb: () => void): () => void {
  const channel = getSupabase()
    .channel("orders:all")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => cb()
    )
    .subscribe();
  return () => {
    getSupabase().removeChannel(channel);
  };
}
