// Payments service.
// DEMO: mock payment dialog resolves instantly with a fake payment id.
// LIVE: Razorpay Checkout (order created + signature verified server-side)
//       and PayPal (order created server-side, approval redirect, capture
//       on /checkout/paypal/return).
// Marketplace note: in live mode the platform account receives the money and
// seller payouts (amount minus platform commission) are made via Razorpay
// Route / PayPal Payouts from the server — mocked in demo mode.

import { isRazorpayLive, isPaypalLive, siteConfig } from "@/config";
import type { Currency } from "@/types";
import { convertFromInr } from "@/lib/currency";

export type PaymentProvider = "razorpay" | "paypal" | "demo";

export interface PaymentRequest {
  amountInr: number;
  displayCurrency: Currency;
  description: string;
  customer: { name: string; email: string };
}

export interface PaymentResult {
  provider: PaymentProvider;
  paymentId: string;
}

export function getAvailableProviders(): PaymentProvider[] {
  const providers: PaymentProvider[] = [];
  if (isRazorpayLive) providers.push("razorpay");
  if (isPaypalLive) providers.push("paypal");
  if (providers.length === 0) providers.push("demo");
  return providers;
}

// ---------------- demo ----------------

export async function demoPay(_req: PaymentRequest): Promise<PaymentResult> {
  await new Promise((r) => setTimeout(r, 600)); // feel like a real gateway
  return { provider: "demo", paymentId: `pay_demo_${Date.now().toString(36)}` };
}

// ---------------- Razorpay ----------------

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(script);
  });
}

export async function payWithRazorpay(req: PaymentRequest): Promise<PaymentResult> {
  await loadRazorpayScript();
  const res = await fetch("/api/payments/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountInr: req.amountInr, description: req.description }),
  });
  if (!res.ok) throw new Error("Could not create the payment order.");
  const { orderId, keyId, amount } = await res.json();

  return new Promise<PaymentResult>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: keyId,
      amount,
      currency: "INR",
      name: siteConfig.name,
      description: req.description,
      order_id: orderId,
      prefill: { name: req.customer.name, email: req.customer.email },
      theme: { color: "#C96F4A" },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        const verify = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (!verify.ok) {
          reject(new Error("Payment signature verification failed."));
          return;
        }
        resolve({ provider: "razorpay", paymentId: response.razorpay_payment_id });
      },
    });
    rzp.open();
  });
}

// ---------------- PayPal ----------------

/**
 * Creates a PayPal order server-side and redirects to the approval page.
 * The /checkout/paypal/return page captures it and finishes the checkout
 * using the pending-checkout snapshot in sessionStorage.
 */
export async function startPaypalCheckout(req: PaymentRequest): Promise<void> {
  const amount = convertFromInr(req.amountInr, req.displayCurrency === "INR" ? "USD" : req.displayCurrency);
  const currency = req.displayCurrency === "INR" ? "USD" : req.displayCurrency;
  const res = await fetch("/api/payments/paypal/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency, description: req.description }),
  });
  if (!res.ok) throw new Error("Could not create the PayPal order.");
  const { approveUrl } = await res.json();
  if (!approveUrl) throw new Error("PayPal did not return an approval link.");
  window.location.href = approveUrl;
}

export async function capturePaypalOrder(token: string): Promise<PaymentResult> {
  const res = await fetch("/api/payments/paypal/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: token }),
  });
  if (!res.ok) throw new Error("PayPal capture failed.");
  const { captureId } = await res.json();
  return { provider: "paypal", paymentId: captureId };
}
