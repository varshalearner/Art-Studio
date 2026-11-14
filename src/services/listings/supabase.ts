import type { Listing, ListingEdit, User } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapListing, mapUser } from "@/lib/supabase/mappers";
import { nowIso, slugify, uid } from "@/lib/utils";
import type { NewListingInput } from "./local";
export type { NewListingInput };

export async function listMine(sellerId: string): Promise<Listing[]> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapListing);
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

export async function create(input: NewListingInput): Promise<Listing> {
  const now = nowIso();
  const status = input.asDraft ? "draft" : "pending";
  const row = {
    slug: `${slugify(input.title)}-${uid().slice(0, 6)}`,
    seller_id: input.sellerId,
    title: input.title,
    description: input.description,
    category: input.category,
    medium: input.medium,
    width_cm: input.widthCm,
    height_cm: input.heightCm,
    price_inr: input.priceInr,
    kind: input.kind,
    images: input.images,
    full_res_url: input.images[0],
    status,
    status_history: [
      { status: "draft", at: now, by: input.sellerId },
      ...(status === "pending" ? [{ status: "pending", at: now, by: input.sellerId }] : []),
    ],
    ships_to: input.kind === "digital" ? [] : input.shipsTo,
    shipping_rates: input.kind === "digital" ? [] : input.shippingRates,
    stock: input.stock,
  };
  const { data, error } = await getSupabase()
    .from("listings")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return mapListing(data);
}

export async function submitForReview(id: string): Promise<Listing> {
  const current = await getById(id);
  if (!current) throw new Error("Listing not found");
  const { data, error } = await getSupabase()
    .from("listings")
    .update({
      status: "pending",
      status_history: [
        ...current.statusHistory,
        { status: "pending", at: nowIso(), by: current.sellerId },
      ],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapListing(data);
}

export async function update(
  id: string,
  patch: Partial<NewListingInput>
): Promise<Listing> {
  const current = await getById(id);
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
    const { data, error } = await getSupabase()
      .from("listings")
      .update({
        pending_edit: edit,
        status_history: [
          ...current.statusHistory,
          {
            status: "edit_pending",
            at: nowIso(),
            by: current.sellerId,
            note: "Edit submitted — old version stays live until approved",
          },
        ],
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapListing(data);
  }

  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.medium !== undefined) row.medium = patch.medium;
  if (patch.widthCm !== undefined) row.width_cm = patch.widthCm;
  if (patch.heightCm !== undefined) row.height_cm = patch.heightCm;
  if (patch.priceInr !== undefined) row.price_inr = patch.priceInr;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.images !== undefined) row.images = patch.images;
  if (patch.shipsTo !== undefined) row.ships_to = patch.shipsTo;
  if (patch.shippingRates !== undefined) row.shipping_rates = patch.shippingRates;
  if (patch.stock !== undefined) row.stock = patch.stock;
  const { data, error } = await getSupabase()
    .from("listings")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapListing(data);
}

async function setStatus(id: string, status: Listing["status"], note?: string): Promise<Listing> {
  const current = await getById(id);
  if (!current) throw new Error("Listing not found");
  const { data, error } = await getSupabase()
    .from("listings")
    .update({
      status,
      status_history: [
        ...current.statusHistory,
        { status, at: nowIso(), by: current.sellerId, note },
      ],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapListing(data);
}

export async function pause(id: string): Promise<Listing> {
  return setStatus(id, "paused");
}

export async function resume(id: string): Promise<Listing> {
  return setStatus(id, "approved", "Resumed by seller");
}

export async function earnings(sellerId: string): Promise<{
  totalInr: number;
  afterCommissionInr: number;
  commissionPercent: number;
  payouts: { id: string; amountInr: number; at: string; status: string }[];
}> {
  const { siteConfig } = await import("@/config");
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .in("status", ["paid", "shipped", "delivered"]);
  if (error) throw error;
  let total = 0;
  const payouts: { id: string; amountInr: number; at: string; status: string }[] = [];
  for (const o of data ?? []) {
    for (const item of (o.items ?? []) as {
      sellerId: string;
      priceInr: number;
      qty: number;
    }[]) {
      if (item.sellerId === sellerId) {
        const gross = item.priceInr * item.qty;
        total += gross;
        payouts.push({
          id: `payout_${o.id}`,
          amountInr: Math.round(gross * (1 - (o.commission_percent ?? 10) / 100)),
          at: o.created_at,
          status: o.status === "delivered" ? "paid out" : "pending",
        });
      }
    }
  }
  return {
    totalInr: total,
    afterCommissionInr: Math.round(total * (1 - siteConfig.platformCommissionPercent / 100)),
    commissionPercent: siteConfig.platformCommissionPercent,
    payouts,
  };
}

export function subscribeMyListings(cb: () => void): () => void {
  const channel = getSupabase()
    .channel("seller:listings")
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

export async function sellerStatus(sellerId: string): Promise<User["sellerProfile"] | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", sellerId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUser(data).sellerProfile ?? null : null;
}
