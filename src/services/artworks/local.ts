import type {
  ArtistSummary,
  Listing,
  Order,
  Report,
  Review,
  ShopFilters,
  User,
} from "@/types";
import {
  findById,
  getAll,
  insert,
  setAll,
  subscribe,
  updateById,
} from "@/lib/local/db";
import { uid, nowIso, sizeBucket, rateLimit } from "@/lib/utils";

function approvedOnly(): Listing[] {
  return getAll<Listing>("listings").filter((l) => l.status === "approved");
}

export async function listApproved(filters: ShopFilters = {}): Promise<Listing[]> {
  let rows = approvedOnly();
  const f = filters;
  if (f.search) {
    const q = f.search.toLowerCase();
    const users = getAll<User>("users");
    rows = rows.filter((l) => {
      const artist = users.find((u) => u.id === l.sellerId);
      return (
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        (artist?.sellerProfile?.displayName.toLowerCase().includes(q) ?? false)
      );
    });
  }
  if (f.category && f.category !== "all") rows = rows.filter((l) => l.category === f.category);
  if (f.medium && f.medium !== "all") rows = rows.filter((l) => l.medium === f.medium);
  if (f.kind && f.kind !== "all") rows = rows.filter((l) => l.kind === f.kind);
  if (f.priceMinInr != null) rows = rows.filter((l) => l.priceInr >= f.priceMinInr!);
  if (f.priceMaxInr != null) rows = rows.filter((l) => l.priceInr <= f.priceMaxInr!);
  if (f.size && f.size !== "all") rows = rows.filter((l) => sizeBucket(l.widthCm, l.heightCm) === f.size);
  if (f.artistId) rows = rows.filter((l) => l.sellerId === f.artistId);
  if (f.shipsToRegion && f.shipsToRegion !== "all") {
    rows = rows.filter(
      (l) => l.kind === "digital" || l.shipsTo.includes(f.shipsToRegion as Listing["shipsTo"][number])
    );
  }
  switch (f.sort) {
    case "price_asc":
      rows.sort((a, b) => a.priceInr - b.priceInr);
      break;
    case "price_desc":
      rows.sort((a, b) => b.priceInr - a.priceInr);
      break;
    case "rating":
      rows.sort((a, b) => b.ratingAvg - a.ratingAvg);
      break;
    default:
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return rows;
}

export async function getBySlug(slug: string): Promise<Listing | null> {
  return approvedOnly().find((l) => l.slug === slug) ?? null;
}

export async function getById(id: string): Promise<Listing | null> {
  return findById<Listing>("listings", id) ?? null;
}

export async function getFeatured(): Promise<Listing[]> {
  const rows = approvedOnly();
  const featured = rows.filter((l) => l.featured);
  return (featured.length >= 3 ? featured : rows).slice(0, 4);
}

function toArtistSummary(u: User, artworkCount: number): ArtistSummary {
  const p = u.sellerProfile!;
  return {
    id: u.id,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    country: p.country,
    verified: p.verified,
    rating: p.rating,
    ratingCount: p.ratingCount,
    artworkCount,
  };
}

export async function listArtists(): Promise<ArtistSummary[]> {
  const listings = approvedOnly();
  return getAll<User>("users")
    .filter(
      (u) =>
        u.isSeller &&
        u.sellerProfile &&
        u.sellerProfile.status === "approved" &&
        !u.sellerProfile.suspended
    )
    .map((u) =>
      toArtistSummary(u, listings.filter((l) => l.sellerId === u.id).length)
    )
    .sort((a, b) => b.rating - a.rating);
}

export async function getArtistByUsername(
  username: string
): Promise<ArtistSummary | null> {
  const all = await listArtists();
  return all.find((a) => a.username === username) ?? null;
}

export async function listByArtist(artistId: string): Promise<Listing[]> {
  return approvedOnly().filter((l) => l.sellerId === artistId);
}

// ---------------- reviews ----------------

export async function listReviews(listingId: string): Promise<Review[]> {
  return getAll<Review>("reviews")
    .filter((r) => r.listingId === listingId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Reviews only after a completed purchase of this artwork. */
export async function canReview(
  userId: string,
  listingId: string
): Promise<{ allowed: boolean; orderId?: string }> {
  const already = getAll<Review>("reviews").some(
    (r) => r.listingId === listingId && r.buyerId === userId
  );
  if (already) return { allowed: false };
  const order = getAll<Order>("orders").find(
    (o) =>
      o.buyerId === userId &&
      ["paid", "shipped", "delivered"].includes(o.status) &&
      o.items.some((i) => i.listingId === listingId)
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
  const review: Review = { id: uid("r"), createdAt: nowIso(), ...input };
  insert("reviews", review);
  // update listing aggregates
  const reviews = await listReviews(input.listingId);
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  updateById<Listing>("listings", input.listingId, {
    ratingAvg: Math.round(avg * 10) / 10,
    ratingCount: reviews.length,
  });
  return review;
}

// ---------------- wishlist ----------------

interface WishlistRow {
  id: string; // user id
  listingIds: string[];
}

export async function getWishlist(userId: string): Promise<string[]> {
  return findById<WishlistRow>("wishlists", userId)?.listingIds ?? [];
}

export async function toggleWishlist(
  userId: string,
  listingId: string
): Promise<string[]> {
  const rows = getAll<WishlistRow>("wishlists");
  let row = rows.find((r) => r.id === userId);
  if (!row) {
    row = { id: userId, listingIds: [] };
    rows.push(row);
  }
  row.listingIds = row.listingIds.includes(listingId)
    ? row.listingIds.filter((id) => id !== listingId)
    : [...row.listingIds, listingId];
  setAll("wishlists", rows);
  return row.listingIds;
}

// ---------------- reports ----------------

export async function reportListing(input: {
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reason: string;
}): Promise<void> {
  if (!rateLimit(`report_${input.reporterId}`, 5, 60 * 60 * 1000)) {
    throw new Error("Too many reports in the last hour. Please try later.");
  }
  const report: Report = {
    id: uid("rep"),
    targetType: "listing",
    targetId: input.listingId,
    targetLabel: input.listingTitle,
    reporterId: input.reporterId,
    reason: input.reason,
    status: "open",
    createdAt: nowIso(),
  };
  insert("reports", report);
}

export function subscribeShop(cb: () => void): () => void {
  return subscribe("listings", cb);
}
