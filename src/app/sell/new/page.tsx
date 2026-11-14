import type { Metadata } from "next";
import { ListingForm } from "@/components/sell/listing-form";

export const metadata: Metadata = { title: "Upload artwork" };

export default function NewListingPage() {
  return <ListingForm />;
}
