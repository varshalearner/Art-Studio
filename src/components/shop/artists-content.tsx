"use client";

import { Avatar } from "@/components/avatar";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { listArtists } from "@/services/artworks";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function ArtistsContent() {
  const { data: artists, isLoading } = useQuery({
    queryKey: ["artists"],
    queryFn: listArtists,
  });

  return (
    <div className="container py-10">
      <h1 className="doodle-underline text-3xl font-bold md:text-4xl">Artists in the studio</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Every artist here is a real person with paint on their hands (or a stylus in them).
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)
          : (artists ?? []).map((a) => (
              <Link
                key={a.id}
                href={`/artist/${a.username}`}
                className="flex gap-4 rounded-lg border bg-card p-5 shadow-cozy card-lift"
              >
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-accent/50">
                  <Avatar src={a.avatarUrl} name={a.displayName} className="h-full w-full text-2xl" />
                </span>
                <span>
                  <span className="flex items-center gap-1.5 font-display text-lg font-semibold">
                    {a.displayName}
                    {a.verified && (
                      <CheckCircle2 className="h-4 w-4 text-sage-dark" aria-label="Verified artist" />
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">{a.country}</span>
                  <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">{a.bio}</span>
                  <span className="mt-2 flex items-center gap-3">
                    <RatingStars rating={a.rating} count={a.ratingCount} />
                    <Badge variant="muted">{a.artworkCount} artworks</Badge>
                  </span>
                </span>
              </Link>
            ))}
      </div>
    </div>
  );
}
