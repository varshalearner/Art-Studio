import { NextResponse } from "next/server";
import { PAYPAL_BASE, getPaypalToken } from "@/lib/paypal";

/** Creates a PayPal order and returns the approval URL for redirect. */
export async function POST(req: Request) {
  const { amount, currency, description } = await req.json();
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (!process.env.PAYPAL_CLIENT_SECRET || !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const token = await getPaypalToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: currency || "USD", value: Number(amount).toFixed(2) },
            description: String(description ?? "").slice(0, 120),
          },
        ],
        application_context: {
          return_url: `${siteUrl}/checkout/paypal/return`,
          cancel_url: `${siteUrl}/cart`,
          brand_name: process.env.NEXT_PUBLIC_SITE_NAME || "Amber Easel Studio",
          user_action: "PAY_NOW",
        },
      }),
    });
    const order = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: "PayPal order failed", details: order }, { status: 502 });
    }
    const approveUrl = (order.links as { rel: string; href: string }[])?.find(
      (l) => l.rel === "approve"
    )?.href;
    return NextResponse.json({ orderId: order.id, approveUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal error" },
      { status: 502 }
    );
  }
}
