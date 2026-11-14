import { NextResponse } from "next/server";
import { PAYPAL_BASE, getPaypalToken } from "@/lib/paypal";

/** Captures an approved PayPal order and returns the capture id. */
export async function POST(req: Request) {
  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
  }
  try {
    const token = await getPaypalToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok || data.status !== "COMPLETED") {
      return NextResponse.json({ error: "Capture failed", details: data }, { status: 502 });
    }
    const captureId =
      data.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? data.id;
    return NextResponse.json({ captureId, status: data.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal error" },
      { status: 502 }
    );
  }
}
