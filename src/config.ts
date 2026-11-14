// ============================================================
// Single source of truth for environment configuration.
// Each service flips from DEMO to LIVE independently, purely
// based on which keys exist — no code changes needed.
// ============================================================

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "Amber Easel Studio",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  defaultCurrency: (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "INR") as
    | "INR"
    | "USD"
    | "EUR"
    | "GBP",
  platformCommissionPercent: Number(
    process.env.NEXT_PUBLIC_PLATFORM_COMMISSION_PERCENT || 10
  ),
  commissionDepositPercent: Number(
    process.env.NEXT_PUBLIC_COMMISSION_DEPOSIT_PERCENT || 40
  ),
  description:
    "A cozy online art studio and marketplace — buy original art, sell your own, or commission a custom painting.",
};

/** Supabase live when both public keys are present. */
export const isSupabaseLive = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const isRazorpayLive = Boolean(
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
);

export const isPaypalLive = Boolean(
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
);

/** At least one real payment provider configured. */
export const isPaymentsLive = isRazorpayLive || isPaypalLive;

/** Server-only check — always false in the browser bundle (secret is stripped). */
export const isEmailLive = Boolean(process.env.RESEND_API_KEY);

export const isExchangeRateLive = Boolean(process.env.EXCHANGE_RATE_API_KEY);

/** True when every core service is still mocked. */
export const isFullDemo = !isSupabaseLive && !isPaymentsLive;

export const demoFlags = {
  supabase: !isSupabaseLive,
  payments: !isPaymentsLive,
  email: !isEmailLive,
};
