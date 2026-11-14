import type { Metadata } from "next";
import { ListingForm } from "@/components/sell/listing-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingForm listingId={id} />;
}
