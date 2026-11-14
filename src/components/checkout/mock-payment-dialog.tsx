"use client";

import { useState } from "react";
import { CreditCard, Loader2, Smartphone, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { demoPay, type PaymentResult } from "@/services/payments";

/**
 * DEMO MODE payment sheet — looks like a tiny gateway, resolves with a fake
 * payment id. Swapped for real Razorpay/PayPal automatically in live mode.
 */
export function MockPaymentDialog({
  open,
  onOpenChange,
  amountLabel,
  description,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountLabel: string;
  description: string;
  onSuccess: (result: PaymentResult) => void | Promise<void>;
}) {
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      const result = await demoPay({
        amountInr: 0,
        displayCurrency: "INR",
        description,
        customer: { name: "", email: "" },
      });
      await onSuccess(result);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-sm" data-testid="mock-payment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mustard-dark" /> Demo payment
          </DialogTitle>
          <DialogDescription>
            No real money moves here. Connect Razorpay or PayPal keys to take real payments.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
          <button
            role="radio"
            aria-checked={method === "upi"}
            onClick={() => setMethod("upi")}
            className={`flex items-center justify-center gap-2 rounded-md border-2 p-3 text-sm font-semibold ${method === "upi" ? "border-primary bg-primary/10" : "border-border"}`}
          >
            <Smartphone className="h-4 w-4" /> UPI
          </button>
          <button
            role="radio"
            aria-checked={method === "card"}
            onClick={() => setMethod("card")}
            className={`flex items-center justify-center gap-2 rounded-md border-2 p-3 text-sm font-semibold ${method === "card" ? "border-primary bg-primary/10" : "border-border"}`}
          >
            <CreditCard className="h-4 w-4" /> Card
          </button>
        </div>
        <Button onClick={pay} disabled={busy} size="lg" className="w-full" data-testid="mock-pay-button">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Processing…" : `Pay ${amountLabel}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
