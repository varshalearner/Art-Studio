import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessContent } from "@/components/checkout/success-content";

export const metadata: Metadata = { title: "Order confirmed" };

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
