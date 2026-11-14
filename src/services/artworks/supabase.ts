import type {
  ArtistSummary,
  Listing,
  Review,
  ShopFilters,
} from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapListing, mapReview, mapUser } from "@/lib/supabase/mappers";
import { sizeBucket } from "@/lib/utils";

export async function listApproved(filters: ShopFilters = {}): Promise<Listing[]> {
  let q = getSupabase().from("listings").select("*").eq("status", "approved");
  const f = filters;
  if (f.category && f.category !== "all") q = q.eq("category", f.category);
  if (f.medium && f.medium !== "all") q = q.eq("medium", f.medium);
  if (f.kind && f.kind !== "all") q = q.eq("kind", f.kind);
  if (f.priceMinInr != null) q = q.gte("price_inr", f.priceMinInr);
  if (f.priceMaxInr != null) q = q.lte("price_inr", f.priceMaxInr);
  if (f.artistId) q = q.eq("seller_id", f.artistId);
  if (f.search) q = q.or(`title.ilike.%${f.search}%,description.ilike.%${f.search}%`);
  switch (f.sort) {
    case "price_asc":
      q = q.order("price_inr", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price_inr", { ascending: false });
      break;
    case "rating":
      q = q.order("rating_avg", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }
  const { data, error } = await q.limit(200);
  if (error) throw error;
  let rows = (data ?? []).map(mapListing);
  // size + ships-to filtering done client-side (jsonb fields)
  if (f.size && f.size !== "all") {
    rows = rows.filter((l) => sizeBucket(l.widthCm, l.heightCm) === f.size);
  }
  if (f.shipsToRegion && f.shipsToRegion !== "all") {
    rows = rows.filter(
      (l) => l.kind === "digital" || l.shipsTo.includes(f.shipsToRegion as Listing["shipsTo"][number])
    );
  }
  return rows;
}

export async function getBySlug(slug: string): Promise<Listing | null> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data ? mapListing(data) : null;
}

export async function getById(id: string): Promise<Listing | null> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapListing(data) : null;
}

export async function getFeatured(): Promise<Listing[]> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("status", "approved")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(4);
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

export async function listArtists(): Promise<ArtistSummary[]> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("is_seller", true);
  if (error) throw error;
  return (data ?? [])
    .map(mapUser)
    .filter(
      (u) =>
        u.sellerProfile &&
        u.sellerProfile.status === "approved" &&
        !u.sellerProfile.suspended
    )
    .map((u) => ({
      id: u.id,
      username: u.sellerProfile!.username,
      displayName: u.sellerProfile!.displayName,
      avatarUrl: u.sellerProfile!.avatarUrl,
      bio: u.sellerProfile!.bio,
      country: u.sellerProfile!.country,
      verified: u.sellerProfile!.verified,
      rating: u.sellerProfile!.rating,
      ratingCount: u.sellerProfile!.ratingCount,
      artworkCount: 0,
    }));
}

export async function getArtistByUsername(
  username: string
): Promise<ArtistSummary | null> {
  const all = await listArtists();
  return all.find((a) => a.username === username) ?? null;
}

export async function listByArtist(artistId: string): Promise<Listing[]> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("seller_id", artistId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

// ---------------- reviews ----------------

export async function listReviews(listingId: string): Promise<Review[]> {
  const { data, error } = await getSupabase()
    .from("reviews")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function canReview(
  userId: string,
  listingId: string
): Promise<{ allowed: boolean; orderId?: string }> {
  const { data: existing } = await getSupabase()
    .from("reviews")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .maybeSingle();
  if (existing) return { allowed: false };
  const { data: orders, error } = await getSupabase()
    .from("orders")
    .select("id, items, status")
    .eq("buyer_id", userId)
    .in("status", ["paid", "shipped", "delivered"]);
  if (error) throw error;
  const order = (orders ?? []).find((o) =>
    (o.items as { listingId: string }[]).some((i) => i.listingId === listingId)
  );
  return order ? { allowed: true, orderId: order.id } : { allowed: false };
}

export async function addReview(input: {
  listingId: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  text: string;
}): Promise<Review> {
  const { data, error } = await getSupabase()
    .from("reviews")
    .insert({
      listing_id: input.listingId,
      order_id: input.orderId,
      buyer_id: input.buyerId,
      buyer_name: input.buyerName,
      rating: input.rating,
      text: input.text,
    })
    .select()
    .single();
  if (error) throw error;
  return mapReview(data); // listing aggregates updated by DB trigger
}

// ---------------- wishlist ----------------

export async function getWishlist(userId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("wishlists")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.listing_id as string);
}

export async function toggleWishlist(
  userId: string,
  listingId: string
): Promise<string[]> {
  const current = await getWishlist(userId);
  if (current.includes(listingId)) {
    await getSupabase()
      .from("wishlists")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
    return current.filter((id) => id !== listingId);
  }
  await getSupabase()
    .from("wishlists")
    .insert({ user_id: userId, listing_id: listingId });
  return [...current, listingId];
}

// ---------------- reports ----------------

export async function reportListing(input: {
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reason: string;
}): Promise<void> {
  const { error } = await getSupabase().from("reports").insert({
    target_type: "listing",
    target_id: input.listingId,
    target_label: input.listingTitle,
    reporter_id: input.reporterId,
    reason: input.reason,
    status: "open",
  });
  if (error) throw error;
}

export function subscribeShop(cb: () => void): () => void {
  const channel = getSupabase()
    .channel("shop:listings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "listings" },
      () => cb()
    )
    .subscribe();
  return () => {
    getSupabase().removeChannel(channel);
  };
}
