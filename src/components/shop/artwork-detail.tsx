"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Flag,
  Heart,
  MessageCircle,
  Ruler,
  ShoppingBasket,
  Star,
  Truck,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import {
  getArtworkBySlug,
  listArtists,
  listReviews,
  canReview,
  addReview,
  getWishlist,
  toggleWishlist,
  reportListing,
} from "@/services/artworks";
import { getOrCreateThread } from "@/services/messages";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { useCart } from "@/hooks/use-cart";
import { SmartImage } from "@/components/smart-image";
import { RatingStars } from "@/components/rating-stars";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { regionLabel } from "@/lib/regions";
import { formatDate, sizeLabel, cn } from "@/lib/utils";

export function ArtworkDetail({ slug }: { slug: string }) {
  const t = useTranslations("artwork");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const { format } = useCurrency();
  const { add } = useCart();
  const queryClient = useQueryClient();

  const [zoomOpen, setZoomOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [imageIndex, setImageIndex] = useState(0);

  const { data: artwork, isLoading } = useQuery({
    queryKey: ["artwork", slug],
    queryFn: () => getArtworkBySlug(slug),
  });
  const { data: artists } = useQuery({ queryKey: ["artists"], queryFn: listArtists });
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", artwork?.id],
    queryFn: () => listReviews(artwork!.id),
    enabled: !!artwork,
  });
  const { data: reviewPermission } = useQuery({
    queryKey: ["can-review", artwork?.id, user?.id],
    queryFn: () => canReview(user!.id, artwork!.id),
    enabled: !!artwork && !!user,
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: () => getWishlist(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="container grid gap-10 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5] rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="container py-16">
        <EmptyState
          title="This artwork has wandered off the wall"
          text="It may have been sold, paused, or the link is a little smudged."
          action={
            <Button asChild>
              <Link href="/shop">Back to the gallery</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const artist = (artists ?? []).find((a) => a.id === artwork.sellerId);
  const wishlisted = wishlist.includes(artwork.id);
  const available = artwork.status === "approved" && (artwork.kind === "digital" || artwork.stock > 0);

  const requireLogin = () => {
    toast.info("Please log in first.");
    router.push("/login");
  };

  const onAddToCart = () => {
    add(artwork.id);
    toast.success(t("addedToCart"));
  };

  const onWishlist = async () => {
    if (!user) return requireLogin();
    await toggleWishlist(user.id, artwork.id);
    queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] });
  };

  const onMessageArtist = async () => {
    if (!user) return requireLogin();
    if (!artist) return;
    const thread = await getOrCreateThread({
      userId: user.id,
      userName: user.name,
      otherUserId: artist.id,
      otherUserName: artist.displayName,
      context: { type: "artwork", id: artwork.id },
      contextLabel: `Artwork: ${artwork.title}`,
    });
    router.push(`/messages/${thread.id}`);
  };

  const onReport = async () => {
    if (!user) return requireLogin();
    if (!reportReason.trim()) return;
    try {
      await reportListing({
        listingId: artwork.id,
        listingTitle: artwork.title,
        reporterId: user.id,
        reason: reportReason,
      });
      toast.success("Thanks — the studio team will take a look.");
      setReportOpen(false);
      setReportReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the report.");
    }
  };

  const onSubmitReview = async () => {
    if (!user || !reviewPermission?.allowed || !reviewPermission.orderId) return;
    await addReview({
      listingId: artwork.id,
      orderId: reviewPermission.orderId,
      buyerId: user.id,
      buyerName: user.name,
      rating: reviewRating,
      text: reviewText,
    });
    setReviewText("");
    toast.success("Review added — thank you!");
    queryClient.invalidateQueries({ queryKey: ["reviews", artwork.id] });
    queryClient.invalidateQueries({ queryKey: ["can-review", artwork.id, user.id] });
  };

  return (
    <div className="container py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* ---------- image ---------- */}
        <div>
          <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
            <DialogTrigger asChild>
              <button
                className="watermarked group relative block aspect-[4/5] w-full overflow-hidden rounded-lg border bg-muted shadow-cozy"
                aria-label="Zoom image"
              >
                <SmartImage
                  src={artwork.images[imageIndex]}
                  alt={`${artwork.title} — full view`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-card/90 p-2 shadow-cozy">
                  <ZoomIn className="h-4 w-4" />
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-2">
              <DialogTitle className="sr-only">{artwork.title}</DialogTitle>
              <div className="watermarked relative max-h-[82vh] overflow-auto">
                <SmartImage
                  src={artwork.images[imageIndex]}
                  alt={`${artwork.title} — zoomed view`}
                  width={1200}
                  height={1500}
                  className="h-auto w-full rounded-md"
                />
              </div>
            </DialogContent>
          </Dialog>
          {artwork.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {artwork.images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setImageIndex(i)}
                  aria-label={`Image ${i + 1}`}
                  className={cn(
                    "relative h-16 w-16 overflow-hidden rounded-md border-2",
                    i === imageIndex ? "border-primary" : "border-transparent"
                  )}
                >
                  <SmartImage src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("watermarkNote")}</p>
        </div>

        {/* ---------- info ---------- */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold" data-testid="artwork-title">
                {artwork.title}
              </h1>
              {artwork.kind === "digital" && <Badge variant="accent">Digital</Badge>}
            </div>
            {artist && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("by")}{" "}
                <Link href={`/artist/${artist.username}`} className="font-semibold text-primary hover:underline">
                  {artist.displayName}
                </Link>{" "}
                {artist.verified && (
                  <span className="inline-flex items-center gap-0.5 text-sage-dark" title={t("verified")}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-label={t("verified")} />
                  </span>
                )}
                · {artist.country}
              </p>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            <p className="font-display text-3xl font-bold text-primary" data-testid="detail-price">
              {format(artwork.priceInr)}
            </p>
            <RatingStars rating={artwork.ratingAvg} count={artwork.ratingCount} size="md" />
          </div>

          <p className="leading-relaxed text-foreground/90">{artwork.description}</p>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <Ruler className="h-3.5 w-3.5" /> {sizeLabel(artwork.widthCm, artwork.heightCm)}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 capitalize">{artwork.medium.replace("_", " ")}</span>
            <span className="rounded-full bg-muted px-3 py-1 capitalize">{artwork.category.replace("_", " ")}</span>
          </div>

          {artwork.kind === "digital" ? (
            <p className="flex items-center gap-2 rounded-md bg-secondary/15 p-3 text-sm">
              <Download className="h-4 w-4 shrink-0 text-sage-dark" /> {t("digitalNote")}
            </p>
          ) : (
            <div className="rounded-md bg-muted/60 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Truck className="h-4 w-4" /> {t("shipsTo")}:
              </p>
              <p className="mt-1 text-muted-foreground">
                {artwork.shipsTo.map((r) => regionLabel(r)).join(", ") || "—"}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button size="lg" onClick={onAddToCart} disabled={!available} data-testid="add-to-cart">
              <ShoppingBasket className="h-4 w-4" />
              {available ? t("addToCart") : t("sold")}
            </Button>
            <Button variant="outline" size="lg" onClick={onWishlist} data-testid="detail-wishlist">
              <Heart className={cn("h-4 w-4", wishlisted && "fill-terracotta text-terracotta")} />
              {wishlisted ? t("removeFromWishlist") : t("addToWishlist")}
            </Button>
            <Button variant="ghost" size="lg" onClick={onMessageArtist} data-testid="message-artist">
              <MessageCircle className="h-4 w-4" /> {t("messageArtist")}
            </Button>
          </div>

          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                <Flag className="h-3 w-3" /> {t("report")}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report this listing</DialogTitle>
                <DialogDescription>
                  Tell the studio team what seems wrong (copyright, spam, inappropriate content…).
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="What's the issue?"
                aria-label="Report reason"
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={onReport} disabled={!reportReason.trim()}>
                  Send report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ---------- reviews ---------- */}
      <section className="mt-16 max-w-3xl" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="doodle-underline text-2xl font-bold">
          {t("reviews")}
        </h2>
        <div className="mt-8 space-y-6">
          {reviews.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
          )}
          {reviews.map((r) => (
            <article key={r.id} className="rounded-lg border bg-card p-4 shadow-cozy">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{r.buyerName}</p>
                <RatingStars rating={r.rating} />
              </div>
              <p className="mt-2 text-sm leading-relaxed">{r.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(r.createdAt, locale)}</p>
            </article>
          ))}

          {reviewPermission?.allowed && (
            <div className="rounded-lg border-2 border-dashed p-4">
              <p className="mb-2 font-semibold">Leave a review</p>
              <div className="mb-2 flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={reviewRating === i}
                    aria-label={`${i} stars`}
                    onClick={() => setReviewRating(i)}
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        i <= reviewRating ? "fill-mustard text-mustard" : "text-muted"
                      )}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="How did the artwork arrive? How does it look on your wall?"
              />
              <Button className="mt-3" onClick={onSubmitReview} disabled={!reviewText.trim()}>
                Submit review
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
