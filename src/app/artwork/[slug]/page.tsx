import type { Metadata } from "next";
import { ArtworkDetail } from "@/components/shop/artwork-detail";

export const metadata: Metadata = {
  title: "Artwork",
};

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ArtworkDetail slug={slug} />;
}
