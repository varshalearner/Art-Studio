import { NextResponse } from "next/server";

/**
 * Creates a Razorpay order (server-side, secret never leaves the server).
 * In demo mode (no keys) it returns a mock order so the UI flow still works.
 */
export async function POST(req: Request) {
  const { amountInr, description } = await req.json();
  const amount = Math.round(Number(amountInr) * 100); // paise
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({
      orderId: `order_demo_${Date.now().toString(36)}`,
      keyId: "demo",
      amount,
      demo: true,
    });
  }

  const Razorpay = (await import("razorpay")).default;
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = await client.orders.create({
    amount,
    currency: "INR",
    notes: { description: String(description ?? "") },
  });
  return NextResponse.json({ orderId: order.id, keyId, amount });
}
