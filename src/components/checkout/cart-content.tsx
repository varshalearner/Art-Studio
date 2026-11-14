"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { getArtworkById } from "@/services/artworks";
import { useCart } from "@/hooks/use-cart";
import { useCurrency } from "@/components/currency-context";
import { SmartImage } from "@/components/smart-image";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CartContent() {
  const t = useTranslations("cart");
  const router = useRouter();
  const { items, remove, setQty } = useCart();
  const { format } = useCurrency();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["cart-listings", items.map((i) => i.listingId).join(",")],
    queryFn: async () => {
      const result = await Promise.all(items.map((i) => getArtworkById(i.listingId)));
      return result;
    },
    enabled: items.length > 0,
  });

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<ShoppingBasket className="h-8 w-8 text-mustard-dark" />}
          title={t("empty")}
          action={<Button asChild><Link href="/shop">{t("browse")}</Link></Button>}
        />
      </div>
    );
  }

  const rows = items
    .map((item) => ({ item, listing: listings?.find((l) => l?.id === item.listingId) ?? null }))
    .filter((r) => r.listing !== null || isLoading);

  const subtotal = rows.reduce(
    (s, r) => s + (r.listing ? r.listing.priceInr * r.item.qty : 0),
    0
  );

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="doodle-underline text-3xl font-bold">{t("title")}</h1>
      <div className="mt-10 space-y-4" data-testid="cart-items">
        {isLoading && !listings
          ? items.map((i) => <Skeleton key={i.listingId} className="h-24 rounded-lg" />)
          : rows.map(({ item, listing }) =>
              listing ? (
                <div
                  key={item.listingId}
                  className="flex items-center gap-4 rounded-lg border bg-card p-3 shadow-cozy"
                  data-testid="cart-item"
                >
                  <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md">
                    <SmartImage src={listing.images[0]} alt={listing.title} fill className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/artwork/${listing.slug}`} className="font-display font-semibold hover:text-primary">
                      {listing.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {listing.kind === "digital" ? t("digitalDelivery") : listing.medium.replace("_", " ")}
                    </p>
                  </div>
                  {listing.kind === "physical" && listing.stock > 1 && (
                    <input
                      type="number"
                      min={1}
                      max={listing.stock}
                      value={item.qty}
                      onChange={(e) => setQty(item.listingId, Number(e.target.value))}
                      aria-label="Quantity"
                      className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  )}
                  <p className="font-semibold text-primary">{format(listing.priceInr * item.qty)}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("remove")}
                    onClick={() => remove(item.listingId)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : null
            )}
      </div>

      <div className="mt-8 rounded-lg border bg-card p-5 shadow-cozy">
        <div className="flex justify-between text-sm">
          <span>{t("subtotal")}</span>
          <span className="font-semibold" data-testid="cart-subtotal">{format(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("shipping")}: calculated at checkout</p>
        <Button
          size="lg"
          className="mt-4 w-full"
          onClick={() => router.push("/checkout")}
          data-testid="checkout-button"
        >
          {t("checkout")}
        </Button>
      </div>
    </div>
  );
}
