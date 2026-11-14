"use client";

import { Avatar } from "@/components/avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, Paintbrush } from "lucide-react";
import { toast } from "sonner";
import { getArtistByUsername, listArtworksByArtist } from "@/services/artworks";
import { getOrCreateThread } from "@/services/messages";
import { useAuth } from "@/components/auth-context";
import { ArtworkCard } from "@/components/artwork-card";
import { EmptyState } from "@/components/empty-state";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ArtistProfile({ username }: { username: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const { data: artist, isLoading } = useQuery({
    queryKey: ["artist", username],
    queryFn: () => getArtistByUsername(username),
  });
  const { data: artworks } = useQuery({
    queryKey: ["artist-art", artist?.id],
    queryFn: () => listArtworksByArtist(artist!.id),
    enabled: !!artist,
  });

  if (isLoading) {
    return (
      <div className="container space-y-8 py-10">
        <Skeleton className="h-40 rounded-lg" />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Artist not found"
          text="This artist page doesn't exist (or isn't public yet)."
          action={<Button asChild><Link href="/artists">All artists</Link></Button>}
        />
      </div>
    );
  }

  const onMessage = async () => {
    if (!user) {
      toast.info("Please log in to send messages.");
      router.push("/login");
      return;
    }
    const thread = await getOrCreateThread({
      userId: user.id,
      userName: user.name,
      otherUserId: artist.id,
      otherUserName: artist.displayName,
      context: { type: "general", id: artist.id },
      contextLabel: `Chat with ${artist.displayName}`,
    });
    router.push(`/messages/${thread.id}`);
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col items-start gap-6 rounded-lg border bg-card p-6 shadow-cozy sm:flex-row sm:items-center">
        <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-accent/40">
          <Avatar src={artist.avatarUrl} name={artist.displayName} className="h-full w-full text-3xl" />
        </span>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold md:text-3xl">
            {artist.displayName}
            {artist.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-2 py-0.5 text-xs font-semibold text-sage-dark">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified artist
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">{artist.country}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed">{artist.bio}</p>
          <div className="mt-2">
            <RatingStars rating={artist.rating} count={artist.ratingCount} size="md" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={onMessage}>
            <MessageCircle className="h-4 w-4" /> Message
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/commission?artist=${artist.id}`}>
              <Paintbrush className="h-4 w-4" /> Commission me
            </Link>
          </Button>
        </div>
      </div>

      <h2 className="doodle-underline mt-12 text-2xl font-bold">Artworks</h2>
      {artworks && artworks.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {artworks.map((l, i) => (
            <ArtworkCard key={l.id} listing={l} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title="No artworks on the wall yet"
          text="This artist is busy painting — check back soon."
        />
      )}
    </div>
  );
}
