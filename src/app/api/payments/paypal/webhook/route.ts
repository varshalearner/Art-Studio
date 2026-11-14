import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

/**
 * PayPal webhook receiver. Configure the webhook in the PayPal developer
 * dashboard pointing at {SITE_URL}/api/payments/paypal/webhook.
 * For production, add webhook signature verification with your webhook id.
 */
export async function POST(req: Request) {
  try {
    const event = await req.json();
    const supabase = getServiceSupabase();
    if (supabase) {
      await supabase.from("payment_events").insert({
        provider: "paypal",
        event_type: event.event_type ?? "unknown",
        payload: event,
      });
    }
  } catch {
    /* ignore parse errors */
  }
  return NextResponse.json({ received: true });
}
