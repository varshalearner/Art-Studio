import type { Metadata } from "next";
import { WishlistContent } from "@/components/shop/wishlist-content";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return <WishlistContent />;
}
