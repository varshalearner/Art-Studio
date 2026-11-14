import type { Listing, ListingEdit, User } from "@/types";
import {
  findById,
  getAll,
  insert,
  subscribe,
  updateById,
} from "@/lib/local/db";
import { uid, nowIso, slugify, rateLimit } from "@/lib/utils";
import { push as notify } from "@/services/notifications/local";
import { DEMO_IDS } from "@/lib/demo-data";

export interface NewListingInput {
  sellerId: string;
  title: string;
  description: string;
  category: Listing["category"];
  medium: Listing["medium"];
  widthCm: number;
  heightCm: number;
  priceInr: number;
  kind: "physical" | "digital";
  images: string[];
  shipsTo: Listing["shipsTo"];
  shippingRates: Listing["shippingRates"];
  stock: number;
  asDraft?: boolean;
}

export async function listMine(sellerId: string): Promise<Listing[]> {
  return getAll<Listing>("listings")
    .filter((l) => l.sellerId === sellerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getById(id: string): Promise<Listing | null> {
  return findById<Listing>("listings", id) ?? null;
}

function uniqueSlug(title: string): string {
  const base = slugify(title);
  const existing = new Set(getAll<Listing>("listings").map((l) => l.slug));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export async function create(input: NewListingInput): Promise<Listing> {
  if (!rateLimit(`upload_${input.sellerId}`, 10, 60 * 60 * 1000)) {
    throw new Error("Upload limit reached (10/hour). Please try again later.");
  }
  const now = nowIso();
  const status = input.asDraft ? "draft" : "pending";
  const listing: Listing = {
    id: uid("l"),
    slug: uniqueSlug(input.title),
    sellerId: input.sellerId,
    title: input.title,
    description: input.description,
    category: input.category,
    medium: input.medium,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    priceInr: input.priceInr,
    kind: input.kind,
    images: input.images,
    fullResUrl: input.images[0],
    status,
    statusHistory: [
      { status: "draft", at: now, by: input.sellerId },
      ...(status === "pending"
        ? [{ status: "pending", at: now, by: input.sellerId }]
        : []),
    ],
    shipsTo: input.kind === "digital" ? [] : input.shipsTo,
    shippingRates: input.kind === "digital" ? [] : input.shippingRates,
    stock: input.stock,
    featured: false,
    pendingEdit: null,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  insert("listings", listing);
  if (status === "pending") {
    await notify({
      userId: DEMO_IDS.admin,
      type: "listing_status",
      title: "New listing to review",
      body: `'${listing.title}' is waiting for approval.`,
      href: "/admin/review",
    });
  }
  return listing;
}

export async function submitForReview(id: string): Promise<Listing> {
  const listing = updateById<Listing>("listings", id, (l) => ({
    ...l,
    status: "pending",
    updatedAt: nowIso(),
    statusHistory: [
      ...l.statusHistory,
      { status: "pending", at: nowIso(), by: l.sellerId },
    ],
  }));
  if (!listing) throw new Error("Listing not found");
  await notify({
    userId: DEMO_IDS.admin,
    type: "listing_status",
    title: "Listing resubmitted for review",
    body: `'${listing.title}' was updated and resubmitted.`,
    href: "/admin/review",
  });
  return listing;
}

/**
 * Edit a listing. If it is currently APPROVED and core fields change,
 * the edit is stored as pendingEdit and goes to review while the old
 * version stays live. Otherwise fields update in place.
 */
export async function update(
  id: string,
  patch: Partial<NewListingInput>
): Promise<Listing> {
  const current = findById<Listing>("listings", id);
  if (!current) throw new Error("Listing not found");

  const coreChanged =
    (patch.title !== undefined && patch.title !== current.title) ||
    (patch.description !== undefined && patch.description !== current.description) ||
    (patch.priceInr !== undefined && patch.priceInr !== current.priceInr) ||
    (patch.images !== undefined &&
      JSON.stringify(patch.images) !== JSON.stringify(current.images));

  if (current.status === "approved" && coreChanged) {
    const edit: ListingEdit = {
      title: patch.title ?? current.title,
      description: patch.description ?? current.description,
      priceInr: patch.priceInr ?? current.priceInr,
      images: patch.images ?? current.images,
      submittedAt: nowIso(),
    };
    const updated = updateById<Listing>("listings", id, (l) => ({
      ...l,
      pendingEdit: edit,
      updatedAt: nowIso(),
      statusHistory: [
        ...l.statusHistory,
        {
          status: "edit_pending",
          at: nowIso(),
          by: l.sellerId,
          note: "Edit submitted — old version stays live until approved",
        },
      ],
    }))!;
    await notify({
      userId: DEMO_IDS.admin,
      type: "listing_status",
      title: "Listing edit to review",
      body: `'${current.title}' has edits waiting for approval.`,
      href: "/admin/review",
    });
    return updated;
  }

  const updated = updateById<Listing>("listings", id, (l) => ({
    ...l,
    ...patch,
    shipsTo: patch.shipsTo ?? l.shipsTo,
    shippingRates: patch.shippingRates ?? l.shippingRates,
    updatedAt: nowIso(),
  }))!;

  // drafts / changes_requested edits go back to pending on explicit submit
  return updated;
}

export async function pause(id: string): Promise<Listing> {
  const l = updateById<Listing>("listings", id, (l) => ({
    ...l,
    status: "paused",
    updatedAt: nowIso(),
    statusHistory: [...l.statusHistory, { status: "paused", at: nowIso(), by: l.sellerId }],
  }));
  if (!l) throw new Error("Listing not found");
  return l;
}

export async function resume(id: string): Promise<Listing> {
  const l = updateById<Listing>("listings", id, (l) => ({
    ...l,
    status: "approved",
    updatedAt: nowIso(),
    statusHistory: [
      ...l.statusHistory,
      { status: "approved", at: nowIso(), by: l.sellerId, note: "Resumed by seller" },
    ],
  }));
  if (!l) throw new Error("Listing not found");
  return l;
}

/** Earnings summary for the seller dashboard. */
export async function earnings(sellerId: string): Promise<{
  totalInr: number;
  afterCommissionInr: number;
  commissionPercent: number;
  payouts: { id: string; amountInr: number; at: string; status: string }[];
}> {
  const { siteConfig } = await import("@/config");
  const orders = getAll<import("@/types").Order>("orders").filter((o) =>
    ["paid", "shipped", "delivered"].includes(o.status)
  );
  let total = 0;
  const payouts: { id: string; amountInr: number; at: string; status: string }[] = [];
  for (const o of orders) {
    for (const item of o.items) {
      if (item.sellerId === sellerId) {
        const gross = item.priceInr * item.qty;
        total += gross;
        payouts.push({
          id: `payout_${o.id}`,
          amountInr: Math.round(gross * (1 - o.commissionPercent / 100)),
          at: o.createdAt,
          status: o.status === "delivered" ? "paid out" : "pending",
        });
      }
    }
  }
  // commissions revenue
  const commissions = getAll<import("@/types").Commission>("commissions").filter(
    (c) => c.artistId === sellerId
  );
  for (const c of commissions) {
    const received = (c.depositPaidInr ?? 0) + (c.finalPaidInr ?? 0);
    if (received > 0) {
      total += received;
      payouts.push({
        id: `payout_${c.id}`,
        amountInr: Math.round(received * (1 - siteConfig.platformCommissionPercent / 100)),
        at: c.createdAt,
        status: c.status === "delivered" ? "paid out" : "pending",
      });
    }
  }
  return {
    totalInr: total,
    afterCommissionInr: Math.round(total * (1 - siteConfig.platformCommissionPercent / 100)),
    commissionPercent: siteConfig.platformCommissionPercent,
    payouts: payouts.sort((a, b) => b.at.localeCompare(a.at)),
  };
}

export function subscribeMyListings(cb: () => void): () => void {
  return subscribe("listings", cb);
}

/** Does this seller still need profile review? Used for badges. */
export async function sellerStatus(sellerId: string): Promise<User["sellerProfile"] | null> {
  const user = findById<User>("users", sellerId);
  return user?.sellerProfile ?? null;
}
