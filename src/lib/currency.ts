import type { Currency } from "@/types";

/**
 * Fallback exchange rates (INR base). In live mode these are replaced by
 * rates from the exchange-rate API, cached once a day (see /api/exchange-rates).
 */
export const FALLBACK_RATES: Record<Currency, number> = {
  INR: 1,
  USD: 1 / 84,
  EUR: 1 / 90,
  GBP: 1 / 106,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const CURRENCIES: Currency[] = ["INR", "USD", "EUR", "GBP"];

export function convertFromInr(
  amountInr: number,
  currency: Currency,
  rates: Record<Currency, number> = FALLBACK_RATES
): number {
  const v = amountInr * (rates[currency] ?? 1);
  // round sensibly: whole rupees, two decimals elsewhere
  return currency === "INR" ? Math.round(v) : Math.round(v * 100) / 100;
}

export function formatMoney(
  amountInr: number,
  currency: Currency,
  rates: Record<Currency, number> = FALLBACK_RATES
): string {
  const v = convertFromInr(amountInr, currency, rates);
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "INR" ? 0 : 2,
    }).format(v);
  } catch {
    return `${CURRENCY_SYMBOLS[currency]}${v}`;
  }
}

/** Guess a currency from the visitor's time zone (manual switcher overrides). */
export function detectCurrency(): Currency {
  if (typeof Intl === "undefined") return "INR";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
    if (tz.startsWith("Europe/London")) return "GBP";
    if (tz.startsWith("Europe/")) return "EUR";
    if (tz.startsWith("America/")) return "USD";
    return "INR";
  } catch {
    return "INR";
  }
}
