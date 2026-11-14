"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Listing } from "@/types";
import { useCurrency } from "@/components/currency-context";
import { SmartImage } from "@/components/smart-image";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { sizeLabel, cn } from "@/lib/utils";

export function ArtworkCard({
  listing,
  artistName,
  onToggleWishlist,
  wishlisted,
  index = 0,
}: {
  listing: Listing;
  artistName?: string;
  onToggleWishlist?: (id: string) => void;
  wishlisted?: boolean;
  index?: number;
}) {
  const { format } = useCurrency();
  const t = useTranslations("artwork");

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="group relative"
      data-testid="artwork-card"
    >
      <Link
        href={`/artwork/${listing.slug}`}
        className="block overflow-hidden rounded-lg border bg-card shadow-cozy card-lift"
      >
        <div className="watermarked relative aspect-[4/5] overflow-hidden bg-muted">
          <SmartImage
            src={listing.images[0]}
            alt={`${listing.title} — ${listing.medium} ${listing.category}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {listing.kind === "digital" && (
            <Badge variant="accent" className="absolute left-3 top-3">
              Digital
            </Badge>
          )}
          {listing.status === "sold" && (
            <Badge variant="grey" className="absolute left-3 top-3">
              {t("sold")}
            </Badge>
          )}
        </div>
        <div className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-semibold leading-snug">
              {listing.title}
            </h3>
            <p className="shrink-0 font-semibold text-primary" data-testid="artwork-price">
              {format(listing.priceInr)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {artistName ? `${t("by")} ${artistName} · ` : ""}
            {listing.medium.replace("_", " ")} · {sizeLabel(listing.widthCm, listing.heightCm)}
          </p>
          <RatingStars rating={listing.ratingAvg} count={listing.ratingCount} />
        </div>
      </Link>
      {onToggleWishlist && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleWishlist(listing.id);
          }}
          aria-label={wishlisted ? t("removeFromWishlist") : t("addToWishlist")}
          className="absolute right-3 top-3 rounded-full bg-card/90 p-2 shadow-cozy transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="wishlist-toggle"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              wishlisted ? "fill-terracotta text-terracotta" : "text-muted-foreground"
            )}
          />
        </button>
      )}
    </motion.article>
  );
}
