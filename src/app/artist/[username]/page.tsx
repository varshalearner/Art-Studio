import type { Metadata } from "next";
import { ArtistProfile } from "@/components/shop/artist-profile";

export const metadata: Metadata = {
  title: "Artist",
};

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <ArtistProfile username={username} />;
}
