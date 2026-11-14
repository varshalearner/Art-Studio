import { beforeEach, describe, expect, it } from "vitest";
import { __resetForTests } from "@/lib/local/db";
import * as orders from "@/services/orders/local";
import * as listings from "@/services/listings/local";
import * as notifications from "@/services/notifications/local";
import { DEMO_IDS } from "@/lib/demo-data";

beforeEach(() => {
  __resetForTests();
});

function orderInput(listingId: string, sellerId: string): orders.NewOrderInput {
  return {
    buyerId: DEMO_IDS.buyer,
    items: [
      {
        listingId,
        sellerId,
        title: "Haveli at Dusk",
        image: "/art/art-05.svg",
        kind: "physical",
        priceInr: 24500,
        qty: 1,
      },
    ],
    shippingAddress: {
      fullName: "Maya Kapoor",
      line1: "14 Lotus Apartments",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      phone: "+91 98765 43210",
    },
    shippingInr: 150,
    subtotalInr: 24500,
    totalInr: 24650,
    displayCurrency: "INR",
    displayTotal: 24650,
    paymentProvider: "demo",
    paymentId: "pay_test_1",
  };
}

describe("orders", () => {
  it("creates a paid order with a timeline and notifies buyer and seller", async () => {
    const order = await orders.create(orderInput("l_05", DEMO_IDS.seller));
    expect(order.status).toBe("paid");
    expect(order.timeline.map((t) => t.status)).toEqual(["placed", "paid"]);

    const buyerNotes = await notifications.list(DEMO_IDS.buyer);
    expect(buyerNotes.some((n) => n.type === "order_status")).toBe(true);
    const sellerNotes = await notifications.list(DEMO_IDS.seller);
    expect(sellerNotes.some((n) => n.title.includes("sale"))).toBe(true);
  });

  it("marks a one-of-a-kind physical artwork as sold", async () => {
    await orders.create(orderInput("l_05", DEMO_IDS.seller));
    const listing = await listings.getById("l_05");
    expect(listing?.stock).toBe(0);
    expect(listing?.status).toBe("sold");
  });

  it("attaches a download url for digital items", async () => {
    const input = orderInput("l_08", "u_sofia");
    input.items[0] = { ...input.items[0], listingId: "l_08", sellerId: "u_sofia", kind: "digital" };
    const order = await orders.create(input);
    expect(order.items[0].downloadUrl).toBeTruthy();
  });

  it("ship → deliver advances the timeline with tracking", async () => {
    const order = await orders.create(orderInput("l_05", DEMO_IDS.seller));
    const shipped = await orders.markShipped(order.id, "TRACK-123");
    expect(shipped.status).toBe("shipped");
    expect(shipped.trackingNumber).toBe("TRACK-123");

    const delivered = await orders.markDelivered(order.id);
    expect(delivered.status).toBe("delivered");
    expect(delivered.timeline.map((t) => t.status)).toEqual([
      "placed",
      "paid",
      "shipped",
      "delivered",
    ]);
  });

  it("lists sales for the right seller", async () => {
    await orders.create(orderInput("l_05", DEMO_IDS.seller));
    const sales = await orders.listSales(DEMO_IDS.seller);
    expect(sales.length).toBeGreaterThan(0);
    const other = await orders.listSales("u_nobody");
    expect(other.length).toBe(0);
  });
});
