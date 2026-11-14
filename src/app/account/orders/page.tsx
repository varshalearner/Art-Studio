import type { Metadata } from "next";
import { OrdersContent } from "@/components/account/orders-content";

export const metadata: Metadata = { title: "My Orders" };

export default function OrdersPage() {
  return <OrdersContent />;
}
