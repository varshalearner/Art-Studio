import type { Metadata } from "next";
import { ArtistsContent } from "@/components/shop/artists-content";

export const metadata: Metadata = {
  title: "Artists",
  description: "Meet the independent artists of the studio.",
};

export default function ArtistsPage() {
  return <ArtistsContent />;
}
