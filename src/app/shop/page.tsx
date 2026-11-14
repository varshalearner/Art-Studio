import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopContent } from "@/components/shop/shop-content";

export const metadata: Metadata = {
  title: "Browse Art",
  description:
    "Original paintings, sketches and digital art from independent artists — filter by category, medium, price and more.",
};

export default function ShopPage() {
  return (
    <Suspense>
      <ShopContent />
    </Suspense>
  );
}
