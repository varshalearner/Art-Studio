import type {
  AdminStats,
  AuditLogEntry,
  Commission,
  Listing,
  Order,
  Report,
  User,
} from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import {
  mapAudit,
  mapCommission,
  mapListing,
  mapOrder,
  mapReport,
  mapUser,
} from "@/lib/supabase/mappers";
import { nowIso } from "@/lib/utils";
import { push as notify } from "@/services/notifications/supabase";
import { siteConfig } from "@/config";

async function log(
  admin: { id: string; name: string },
  action: string,
  targetType: string,
  targetId: string,
  note?: string
): Promise<void> {
  await getSupabase().from("audit_log").insert({
    admin_id: admin.id,
    admin_name: admin.name,
    action,
    target_type: targetType,
    target_id: targetId,
    note: note ?? null,
  });
}

export async function stats(): Promise<AdminStats> {
  const sb = getSupabase();
  const [listings, orders, users, reports] = await Promise.all([
    sb.from("listings").select("id,status,pending_edit"),
    sb.from("orders").select("*").in("status", ["paid", "shipped", "delivered"]),
    sb.from("profiles").select("*"),
    sb.from("reports").select("id,status"),
  ]);
  const orderRows = (orders.data ?? []).map(mapOrder);
  const userRows = (users.data ?? []).map(mapUser);
  const totalSales = orderRows.reduce((s, o) => s + o.totalInr, 0);
  const salesBySeller = new Map<string, number>();
  for (const o of orderRows) {
    for (const item of o.items) {
      salesBySeller.set(
        item.sellerId,
        (salesBySeller.get(item.sellerId) ?? 0) + item.priceInr * item.qty
      );
    }
  }
  return {
    pendingListings: (listings.data ?? []).filter(
      (l) => l.status === "pending" || l.pending_edit
    ).length,
    pendingSellers: userRows.filter((u) => u.sellerProfile?.status === "pending")
      .length,
    openReports: (reports.data ?? []).filter((r) => r.status === "open").length,
    totalSalesInr: totalSales,
    commissionEarnedInr: Math.round(
      totalSales * (siteConfig.platformCommissionPercent / 100)
    ),
    orderCount: orderRows.length,
    userCount: userRows.length,
    topArtists: [...salesBySeller.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, salesInr]) => ({
        id,
        name:
          userRows.find((u) => u.id === id)?.sellerProfile?.displayName ??
          "Unknown",
        salesInr,
      })),
  };
}

export async function listPendingListings(): Promise<Listing[]> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .or("status.eq.pending,pending_edit.not.is.null")
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

async function getListing(id: string): Promise<Listing> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapListing(data);
}

export async function approveListing(
  id: string,
  admin: { id: string; name: string },
  note?: string
): Promise<Listing> {
  const current = await getListing(id);
  const patch: Record<string, unknown> = {
    status: "approved",
    admin_note: note ?? null,
    pending_edit: null,
    status_history: [
      ...current.statusHistory,
      { status: "approved", at: nowIso(), by: admin.id, note },
    ],
  };
  if (current.pendingEdit) {
    patch.title = current.pendingEdit.title;
    patch.description = current.pendingEdit.description;
    patch.price_inr = current.pendingEdit.priceInr;
    patch.images = current.pendingEdit.images;
  }
  const { data, error } = await getSupabase()
    .from("listings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await log(admin, "approve_listing", "listing", id, note);
  const updated = mapListing(data);
  await notify({
    userId: updated.sellerId,
    type: "listing_status",
    title: "Listing approved ✅",
    body: `'${updated.title}' is now live in the shop!`,
    href: "/sell",
  });
  return updated;
}

async function setListingStatus(
  id: string,
  status: Listing["status"] | "keep",
  note: string,
  admin: { id: string; name: string },
  action: string,
  historyStatus: string
): Promise<Listing> {
  const current = await getListing(id);
  const { data, error } = await getSupabase()
    .from("listings")
    .update({
      status: status === "keep" ? current.status : status,
      pending_edit: null,
      admin_note: note,
      status_history: [
        ...current.statusHistory,
        { status: historyStatus, at: nowIso(), by: admin.id, note },
      ],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await log(admin, action, "listing", id, note);
  return mapListing(data);
}

export async function requestChanges(
  id: string,
  note: string,
  admin: { id: string; name: string }
): Promise<Listing> {
  if (!note.trim()) throw new Error("A reason is required for 'Changes requested'.");
  const current = await getListing(id);
  const updated = await setListingStatus(
    id,
    current.pendingEdit ? "keep" : "changes_requested",
    note,
    admin,
    "request_changes",
    "changes_requested"
  );
  await notify({
    userId: updated.sellerId,
    type: "listing_status",
    title: "Changes requested on your listing",
    body: `'${updated.title}': ${note}`,
    href: "/sell",
  });
  return updated;
}

export async function rejectListing(
  id: string,
  note: string,
  admin: { id: string; name: string }
): Promise<Listing> {
  if (!note.trim()) throw new Error("A reason is required for 'Rejected'.");
  const updated = await setListingStatus(id, "rejected", note, admin, "reject_listing", "rejected");
  await notify({
    userId: updated.sellerId,
    type: "listing_status",
    title: "Listing rejected",
    body: `'${updated.title}': ${note}`,
    href: "/sell",
  });
  return updated;
}

export async function removeListing(
  id: string,
  note: string,
  admin: { id: string; name: string }
): Promise<Listing> {
  const updated = await setListingStatus(id, "removed", note, admin, "remove_listing", "removed");
  await notify({
    userId: updated.sellerId,
    type: "listing_status",
    title: "Listing removed by the studio",
    body: `'${updated.title}': ${note}`,
    href: "/sell",
  });
  return updated;
}

export async function bulkApprove(
  ids: string[],
  admin: { id: string; name: string }
): Promise<number> {
  let count = 0;
  for (const id of ids) {
    try {
      await approveListing(id, admin, "Bulk approved");
      count++;
    } catch {
      /* skip */
    }
  }
  return count;
}

export async function listUsers(): Promise<User[]> {
  const { data, error } = await getSupabase().from("profiles").select("*");
  if (error) throw error;
  return (data ?? []).map(mapUser);
}

export async function listPendingSellers(): Promise<User[]> {
  return (await listUsers()).filter((u) => u.sellerProfile?.status === "pending");
}

async function patchSellerProfile(
  userId: string,
  patch: (p: NonNullable<User["sellerProfile"]>) => NonNullable<User["sellerProfile"]>
): Promise<User> {
  const { data: row, error: e1 } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (e1) throw e1;
  const user = mapUser(row);
  if (!user.sellerProfile) throw new Error("Not a seller");
  const { data, error } = await getSupabase()
    .from("profiles")
    .update({ seller_profile: patch(user.sellerProfile) })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return mapUser(data);
}

export async function approveSeller(
  userId: string,
  admin: { id: string; name: string }
): Promise<User> {
  const user = await patchSellerProfile(userId, (p) => ({ ...p, status: "approved" }));
  await log(admin, "approve_seller", "user", userId);
  await notify({
    userId,
    type: "system",
    title: "Seller profile approved 🎨",
    body: "Welcome to the studio! Your artist page is now public.",
    href: "/sell",
  });
  return user;
}

export async function verifySeller(
  userId: string,
  verified: boolean,
  admin: { id: string; name: string }
): Promise<User> {
  const user = await patchSellerProfile(userId, (p) => ({ ...p, verified }));
  await log(admin, verified ? "verify_seller" : "unverify_seller", "user", userId);
  return user;
}

export async function suspendUser(
  userId: string,
  suspended: boolean,
  admin: { id: string; name: string },
  note?: string
): Promise<User> {
  const user = await patchSellerProfile(userId, (p) => ({ ...p, suspended }));
  await log(admin, suspended ? "suspend_user" : "unsuspend_user", "user", userId, note);
  return user;
}

export async function listAllOrders(): Promise<Order[]> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function refundOrder(
  id: string,
  admin: { id: string; name: string },
  note?: string
): Promise<Order> {
  const { data: row, error: e1 } = await getSupabase()
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const current = mapOrder(row);
  const { data, error } = await getSupabase()
    .from("orders")
    .update({
      status: "refunded",
      timeline: [...current.timeline, { status: "refunded", at: nowIso(), by: admin.id, note }],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await log(admin, "refund_order", "order", id, note);
  return mapOrder(data);
}

export async function listAllCommissions(): Promise<Commission[]> {
  const { data, error } = await getSupabase()
    .from("commissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCommission);
}

export async function listReports(): Promise<Report[]> {
  const { data, error } = await getSupabase()
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReport);
}

export async function resolveReport(
  id: string,
  status: "resolved" | "dismissed",
  admin: { id: string; name: string },
  note?: string
): Promise<Report> {
  const { data, error } = await getSupabase()
    .from("reports")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await log(admin, `report_${status}`, "report", id, note);
  return mapReport(data);
}

export async function listAudit(): Promise<AuditLogEntry[]> {
  const { data, error } = await getSupabase()
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapAudit);
}

export function subscribeAdmin(cb: () => void): () => void {
  const channel = getSupabase()
    .channel("admin:all")
    .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => cb())
    .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => cb())
    .subscribe();
  return () => {
    getSupabase().removeChannel(channel);
  };
}
