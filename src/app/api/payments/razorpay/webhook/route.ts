import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase/server";

/**
 * Razorpay webhook: verifies the signature with RAZORPAY_WEBHOOK_SECRET and
 * records payment events. Point your Razorpay dashboard webhook at
 * {SITE_URL}/api/payments/razorpay/webhook with events payment.captured,
 * payment.failed and refund.processed.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const body = await req.text();

  if (secret) {
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const ok =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  try {
    const event = JSON.parse(body);
    const supabase = getServiceSupabase();
    if (supabase) {
      await supabase.from("payment_events").insert({
        provider: "razorpay",
        event_type: event.event ?? "unknown",
        payload: event,
      });
      if (event.event === "payment.captured") {
        const paymentId = event.payload?.payment?.entity?.id;
        if (paymentId) {
          await supabase
            .from("orders")
            .update({ status: "paid" })
            .eq("payment_id", paymentId)
            .eq("status", "placed");
        }
      }
    }
  } catch {
    // never fail webhooks on our own parse errors; Razorpay retries otherwise
  }
  return NextResponse.json({ received: true });
}
