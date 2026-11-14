import type { Address, Currency, Listing, Order, OrderItem } from "@/types";
import { findById, getAll, insert, subscribe, updateById } from "@/lib/local/db";
import { uid, nowIso } from "@/lib/utils";
import { push as notify } from "@/services/notifications/local";
import { siteConfig } from "@/config";

export interface NewOrderInput {
  buyerId: string;
  items: OrderItem[];
  shippingAddress?: Address;
  shippingInr: number;
  subtotalInr: number;
  totalInr: number;
  displayCurrency: Currency;
  displayTotal: number;
  paymentProvider: Order["paymentProvider"];
  paymentId?: string;
}

/** Called after a successful payment — order is created already 'paid'. */
export async function create(input: NewOrderInput): Promise<Order> {
  const now = nowIso();
  const items = input.items.map((item) => ({
    ...item,
    downloadUrl:
      item.kind === "digital"
        ? findById<Listing>("listings", item.listingId)?.fullResUrl ?? item.image
        : undefined,
  }));
  const order: Order = {
    id: uid("o"),
    buyerId: input.buyerId,
    items,
    shippingAddress: input.shippingAddress,
    shippingInr: input.shippingInr,
    subtotalInr: input.subtotalInr,
    totalInr: input.totalInr,
    displayCurrency: input.displayCurrency,
    displayTotal: input.displayTotal,
    commissionPercent: siteConfig.platformCommissionPercent,
    status: "paid",
    paymentProvider: input.paymentProvider,
    paymentId: input.paymentId,
    timeline: [
      { status: "placed", at: now },
      { status: "paid", at: now, note: `Paid via ${input.paymentProvider}` },
    ],
    createdAt: now,
  };
  insert("orders", order);

  // stock handling: unique artworks become 'sold'
  for (const item of items) {
    const listing = findById<Listing>("listings", item.listingId);
    if (listing && listing.kind === "physical") {
      const newStock = Math.max(0, listing.stock - item.qty);
      updateById<Listing>("listings", item.listingId, (l) => ({
        ...l,
        stock: newStock,
        status: newStock === 0 ? "sold" : l.status,
        statusHistory:
          newStock === 0
            ? [...l.statusHistory, { status: "sold", at: now }]
            : l.statusHistory,
      }));
    }
    await notify({
      userId: item.sellerId,
      type: "order_status",
      title: "You made a sale! 🎉",
      body: `'${item.title}' was just purchased.`,
      href: "/sell?tab=orders",
    });
  }
  await notify({
    userId: input.buyerId,
    type: "order_status",
    title: "Order confirmed",
    body: `Your order of ${items.length} artwork${items.length > 1 ? "s" : ""} is confirmed.`,
    href: `/account/orders/${order.id}`,
  });
  return order;
}

export async function listMine(buyerId: string): Promise<Order[]> {
  return getAll<Order>("orders")
    .filter((o) => o.buyerId === buyerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSales(sellerId: string): Promise<Order[]> {
  return getAll<Order>("orders")
    .filter((o) => o.items.some((i) => i.sellerId === sellerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getById(id: string): Promise<Order | null> {
  return findById<Order>("orders", id) ?? null;
}

export async function markShipped(id: string, trackingNumber: string): Promise<Order> {
  const order = updateById<Order>("orders", id, (o) => ({
    ...o,
    status: "shipped",
    trackingNumber,
    timeline: [
      ...o.timeline,
      { status: "shipped", at: nowIso(), note: `Tracking: ${trackingNumber}` },
    ],
  }));
  if (!order) throw new Error("Order not found");
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
  const order = updateById<Order>("orders", id, (o) => ({
    ...o,
    status: "delivered",
    timeline: [...o.timeline, { status: "delivered", at: nowIso() }],
  }));
  if (!order) throw new Error("Order not found");
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
  return subscribe("orders", cb);
}
