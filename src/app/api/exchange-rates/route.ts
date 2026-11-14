import { NextResponse } from "next/server";
import { FALLBACK_RATES } from "@/lib/currency";

export const revalidate = 86400; // cache for one day

/**
 * Exchange rates with INR base. Uses exchangerate-api.com when a key exists,
 * otherwise returns the built-in approximate rates. Cached once per day.
 */
export async function GET() {
  const key = process.env.EXCHANGE_RATE_API_KEY;
  if (!key) {
    return NextResponse.json({ rates: FALLBACK_RATES, source: "fallback" });
  }
  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${key}/latest/INR`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error("rate api error");
    const data = await res.json();
    const r = data.conversion_rates ?? {};
    return NextResponse.json({
      rates: {
        INR: 1,
        USD: r.USD ?? FALLBACK_RATES.USD,
        EUR: r.EUR ?? FALLBACK_RATES.EUR,
        GBP: r.GBP ?? FALLBACK_RATES.GBP,
      },
      source: "exchangerate-api",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ rates: FALLBACK_RATES, source: "fallback" });
  }
}
