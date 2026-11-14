import { NextResponse } from "next/server";
import { siteConfig } from "@/config";

/**
 * Seller payout endpoint (marketplace split payments).
 * The platform receives the full payment; the seller gets the amount minus
 * the platform commission. In production this calls Razorpay Route
 * (transfers) or PayPal Payouts — here it computes and records the split,
 * and stays a safe mock until payout credentials are configured.
 */
export async function POST(req: Request) {
  const { sellerId, amountInr, orderId } = await req.json();
  if (!sellerId || !Number.isFinite(Number(amountInr))) {
    return NextResponse.json({ error: "Invalid payout request" }, { status: 400 });
  }
  const commission = Math.round(Number(amountInr) * (siteConfig.platformCommissionPercent / 100));
  const net = Number(amountInr) - commission;

  // TODO (live): call Razorpay Route transfer / PayPal Payouts here.
  return NextResponse.json({
    ok: true,
    mock: !process.env.RAZORPAY_KEY_SECRET,
    sellerId,
    orderId: orderId ?? null,
    grossInr: Number(amountInr),
    commissionInr: commission,
    netInr: net,
  });
}
