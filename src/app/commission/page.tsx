import type { Metadata } from "next";
import { Suspense } from "react";
import { CommissionForm } from "@/components/commission/commission-form";

export const metadata: Metadata = {
  title: "Commission a Painting",
  description:
    "Describe your dream artwork with photos, words or a sketch — an independent artist will paint it for you.",
};

export default function CommissionPage() {
  return (
    <Suspense>
      <CommissionForm />
    </Suspense>
  );
}
