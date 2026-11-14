"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { getArtworkById, getWishlist, toggleWishlist } from "@/services/artworks";
import { useAuth } from "@/components/auth-context";
import { ArtworkCard } from "@/components/artwork-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function WishlistContent() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: ids = [], isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: () => getWishlist(user!.id),
    enabled: !!user,
  });

  const { data: listings } = useQuery({
    queryKey: ["wishlist-listings", ids.join(",")],
    queryFn: async () =>
      (await Promise.all(ids.map((id) => getArtworkById(id)))).filter(
        (l): l is NonNullable<typeof l> => l !== null
      ),
    enabled: ids.length > 0,
  });

  if (!loading && !user) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<Heart className="h-8 w-8 text-terracotta" />}
          title="Log in to see your wishlist"
          action={<Button asChild><Link href="/login?next=/wishlist">Log in</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="doodle-underline text-3xl font-bold">Your Wishlist</h1>
      {isLoading ? (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
          ))}
        </div>
      ) : ids.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Heart className="h-8 w-8 text-terracotta" />}
          title="No favourites yet"
          text="Tap the heart on any artwork and it will wait for you here."
          action={<Button asChild><Link href="/shop">Browse the gallery</Link></Button>}
        />
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {(listings ?? []).map((l, i) => (
            <ArtworkCard
              key={l.id}
              listing={l}
              index={i}
              wishlisted
              onToggleWishlist={async (id) => {
                if (!user) return;
                await toggleWishlist(user.id, id);
                queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
