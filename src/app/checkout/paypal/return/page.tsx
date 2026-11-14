import { Suspense } from "react";
import { PaypalReturnContent } from "@/components/checkout/paypal-return-content";

export const metadata = { title: "Completing payment…" };

export default function PaypalReturnPage() {
  return (
    <Suspense>
      <PaypalReturnContent />
    </Suspense>
  );
}
