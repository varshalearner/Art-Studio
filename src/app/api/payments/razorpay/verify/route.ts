import { NextResponse } from "next/server";
import crypto from "node:crypto";

/** Verifies the Razorpay payment signature (HMAC-SHA256 of order_id|payment_id). */
export async function POST(req: Request) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    // demo mode: accept mock payments
    return NextResponse.json({ valid: true, demo: true });
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const valid =
    expected.length === String(razorpay_signature).length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)));

  if (!valid) return NextResponse.json({ valid: false }, { status: 400 });
  return NextResponse.json({ valid: true });
}
