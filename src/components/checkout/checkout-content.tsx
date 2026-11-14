"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import type { Address, Listing, OrderItem } from "@/types";
import { getArtworkById } from "@/services/artworks";
import { createOrder } from "@/services/orders";
import {
  getAvailableProviders,
  payWithRazorpay,
  startPaypalCheckout,
  type PaymentProvider,
  type PaymentResult,
} from "@/services/payments";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { useCart } from "@/hooks/use-cart";
import { MockPaymentDialog } from "@/components/checkout/mock-payment-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { countryToRegion } from "@/lib/regions";

const addressSchema = z.object({
  fullName: z.string().min(2, "Required"),
  line1: z.string().min(3, "Required"),
  line2: z.string().optional(),
  city: z.string().min(2, "Required"),
  state: z.string().min(2, "Required"),
  postalCode: z.string().min(3, "Required"),
  country: z.string().min(2, "Required"),
  phone: z.string().min(6, "Required"),
});

export function CheckoutContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { items, clear } = useCart();
  const { format, currency, convert } = useCurrency();
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>(getAvailableProviders()[0]);
  const [address, setAddress] = useState<Address | null>(null);

  const { data: listings } = useQuery({
    queryKey: ["checkout-listings", items.map((i) => i.listingId).join(",")],
    queryFn: async () =>
      (await Promise.all(items.map((i) => getArtworkById(i.listingId)))).filter(
        (l): l is Listing => l !== null
      ),
    enabled: items.length > 0,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Address>({ resolver: zodResolver(addressSchema) });

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/checkout");
  }, [loading, user, router]);

  if (!user) return null;

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Nothing to check out"
          action={<Button asChild><Link href="/shop">Browse the gallery</Link></Button>}
        />
      </div>
    );
  }

  if (!listings) {
    return (
      <div className="container flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const rows = items
    .map((item) => ({ item, listing: listings.find((l) => l.id === item.listingId)! }))
    .filter((r) => r.listing);

  const hasPhysical = rows.some((r) => r.listing.kind === "physical");
  const subtotalInr = rows.reduce((s, r) => s + r.listing.priceInr * r.item.qty, 0);

  function shippingFor(addr: Address | null): number {
    if (!hasPhysical || !addr) return 0;
    const region = countryToRegion(addr.country);
    let total = 0;
    for (const r of rows) {
      if (r.listing.kind !== "physical") continue;
      const rate = r.listing.shippingRates.find((x) => x.region === region);
      if (!rate) return -1; // seller doesn't ship there
      total += rate.rateInr;
    }
    return total;
  }

  const shippingInr = shippingFor(address);
  const totalInr = subtotalInr + Math.max(0, shippingInr);

  const onAddressSubmit = (values: Address) => {
    const s = shippingFor(values);
    if (s === -1) {
      toast.error("One of the artworks doesn't ship to that country. Check 'ships to' on the artwork page.");
      return;
    }
    setAddress(values);
  };

  const buildOrderItems = (): OrderItem[] =>
    rows.map((r) => ({
      listingId: r.listing.id,
      sellerId: r.listing.sellerId,
      title: r.listing.title,
      image: r.listing.images[0],
      kind: r.listing.kind,
      priceInr: r.listing.priceInr,
      qty: r.item.qty,
    }));

  const finishOrder = async (payment: PaymentResult) => {
    const order = await createOrder({
      buyerId: user.id,
      items: buildOrderItems(),
      shippingAddress: address ?? undefined,
      shippingInr: Math.max(0, shippingInr),
      subtotalInr,
      totalInr,
      displayCurrency: currency,
      displayTotal: convert(totalInr),
      paymentProvider: payment.provider,
      paymentId: payment.paymentId,
    });
    clear();
    router.push(`/checkout/success?order=${order.id}`);
  };

  const onPay = async () => {
    if (hasPhysical && !address) {
      toast.info("Please save your shipping address first.");
      return;
    }
    if (provider === "demo") {
      setPayOpen(true);
      return;
    }
    setBusy(true);
    try {
      if (provider === "razorpay") {
        const result = await payWithRazorpay({
          amountInr: totalInr,
          displayCurrency: currency,
          description: `Order of ${rows.length} artwork(s)`,
          customer: { name: user.name, email: user.email },
        });
        await finishOrder(result);
      } else if (provider === "paypal") {
        // snapshot so the return page can finish the order after capture
        sessionStorage.setItem(
          "aes_pending_checkout",
          JSON.stringify({
            items: buildOrderItems(),
            address,
            shippingInr: Math.max(0, shippingInr),
            subtotalInr,
            totalInr,
            currency,
            displayTotal: convert(totalInr),
            buyerId: user.id,
          })
        );
        await startPaypalCheckout({
          amountInr: totalInr,
          displayCurrency: currency,
          description: `Order of ${rows.length} artwork(s)`,
          customer: { name: user.name, email: user.email },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  const providers = getAvailableProviders();

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="doodle-underline text-3xl font-bold">Checkout</h1>
      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {hasPhysical && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSubmit(onAddressSubmit)}
                  className="grid gap-3 sm:grid-cols-2"
                  data-testid="address-form"
                >
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" className="mt-1" autoComplete="name" {...register("fullName")} />
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="line1">Address line 1</Label>
                    <Input id="line1" className="mt-1" autoComplete="address-line1" {...register("line1")} />
                    {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="line2">Address line 2 (optional)</Label>
                    <Input id="line2" className="mt-1" autoComplete="address-line2" {...register("line2")} />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" className="mt-1" autoComplete="address-level2" {...register("city")} />
                    {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state">State / province</Label>
                    <Input id="state" className="mt-1" autoComplete="address-level1" {...register("state")} />
                    {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal code</Label>
                    <Input id="postalCode" className="mt-1" autoComplete="postal-code" {...register("postalCode")} />
                    {errors.postalCode && <p className="text-xs text-destructive">{errors.postalCode.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" className="mt-1" autoComplete="country-name" placeholder="India" {...register("country")} />
                    {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" className="mt-1" autoComplete="tel" {...register("phone")} />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant={address ? "secondary" : "default"} data-testid="save-address">
                      {address ? "Address saved ✓ (edit & save again)" : "Save address"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment provider">
                {providers.map((p) => (
                  <button
                    key={p}
                    role="radio"
                    aria-checked={provider === p}
                    onClick={() => setProvider(p)}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-semibold capitalize ${provider === p ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    {p === "demo" ? "Demo payment" : p}
                  </button>
                ))}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                {provider === "demo"
                  ? "Demo mode: payments are simulated, nothing is charged."
                  : "Payments are processed securely; card details never touch our servers."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* summary */}
        <Card className="h-fit md:sticky md:top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {rows.map((r) => (
              <div key={r.listing.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {r.listing.title} ×{r.item.qty}
                </span>
                <span className="shrink-0">{format(r.listing.priceInr * r.item.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2">
              <span>Subtotal</span>
              <span>{format(subtotalInr)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>
                {!hasPhysical
                  ? "Free (digital)"
                  : address
                    ? shippingInr >= 0
                      ? format(shippingInr)
                      : "—"
                    : "enter address"}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 font-display text-lg font-bold">
              <span>Total</span>
              <span className="text-primary" data-testid="checkout-total">{format(totalInr)}</span>
            </div>
            <Button
              size="lg"
              className="mt-3 w-full"
              onClick={onPay}
              disabled={busy || (hasPhysical && !address)}
              data-testid="pay-button"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Pay {format(totalInr)}
            </Button>
          </CardContent>
        </Card>
      </div>

      <MockPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        amountLabel={format(totalInr)}
        description={`Order of ${rows.length} artwork(s) from the studio`}
        onSuccess={finishOrder}
      />
    </div>
  );
}
