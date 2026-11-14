import type { Metadata } from "next";
import { Suspense } from "react";
import { SellDashboard } from "@/components/sell/sell-dashboard";

export const metadata: Metadata = {
  title: "Sell your art",
  description: "Open your own corner of the studio — list artworks, fulfil orders and take commissions.",
};

export default function SellPage() {
  return (
    <Suspense>
      <SellDashboard />
    </Suspense>
  );
}
