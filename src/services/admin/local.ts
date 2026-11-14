import type {
  AdminStats,
  AuditLogEntry,
  Commission,
  Listing,
  Order,
  Report,
  User,
} from "@/types";
import {
  findById,
  getAll,
  insert,
  subscribe,
  updateById,
} from "@/lib/local/db";
import { uid, nowIso } from "@/lib/utils";
import { push as notify } from "@/services/notifications/local";
import { siteConfig } from "@/config";

async function log(
  admin: { id: string; name: string },
  action: string,
  targetType: string,
  targetId: string,
  note?: string
): Promise<void> {
  const entry: AuditLogEntry = {
    id: uid("a"),
    adminId: admin.id,
    adminName: admin.name,
    action,
    targetType,
    targetId,
    note,
    createdAt: nowIso(),
  };
  insert("audit", entry);
}

export async function stats(): Promise<AdminStats> {
  const listings = getAll<Listing>("listings");
  const orders = getAll<Order>("orders").filter((o) =>
    ["paid", "shipped", "delivered"].includes(o.status)
  );
  const users = getAll<User>("users");
  const totalSales = orders.reduce((s, o) => s + o.totalInr, 0);
  const salesBySeller = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.items) {
      salesBySeller.set(
        item.sellerId,
        (salesBySeller.get(item.sellerId) ?? 0) + item.priceInr * item.qty
      );
    }
  }
  const topArtists = [...salesBySeller.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, salesInr]) => ({
      id,
      name:
        users.find((u) => u.id === id)?.sellerProfile?.displayName ?? "Unknown",
      salesInr,
    }));
  return {
    pendingListings: listings.filter(
      (l) => l.status === "pending" || l.pendingEdit
    ).length,
    pendingSellers: users.filter(
      (u) => u.sellerProfile?.status === "pending"
    ).length,
    openReports: getAll<Report>("reports").filter((r) => r.status === "open").length,
    totalSalesInr: totalSales,
    commissionEarnedInr: Math.round(
      totalSales * (siteConfig.platformCommissionPercent / 100)
    ),
    orderCount: orders.length,
    userCount: users.length,
    topArtists,
  };
}

/** Pending new listings + approved listings with pending edits. */
export async function listPendingListings(): Promise<Listing[]> {
  return getAll<Listing>("listings")
    .filter((l) => l.status === "pending" || Boolean(l.pendingEdit))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export async function approveListing(
  id: string,
  admin: { id: string; name: string },
  note?: string
): Promise<Listing> {
  const current = findById<Listing>("listings", id);
  if (!current) throw new Error("Listing not found");

  let updated: Listing;
  if (current.pendingEdit) {
    // approving an edit: merge it in, stay live
    const e = current.pendingEdit;
    updated = updateById<Listing>("listings", id, (l) => ({
      ...l,
      title: e.title,
      description: e.description,
      priceInr: e.priceInr,
      images: e.images,
      pendingEdit: null,
      status: "approved",
      adminNote: note,
      updatedAt: nowIso(),
      statusHistory: [
        ...l.statusHistory,
        { status: "approved", at: nowIso(), by: admin.id, note: note ?? "Edit approved" },
      ],
    }))!;
  } else {
    updated = updateById<Listing>("listings", id, (l) => ({
      ...l,
      status: "approved",
      adminNote: note,
      updatedAt: nowIso(),
      statusHistory: [
        ...l.statusHistory,
        { status: "approved", at: nowIso(), by: admin.id, note },
      ],
    }))!;
  }
  await log(admin, "approve_listing", "listing", id, note);
  await notify({
    userId: updated.sellerId,
    type: "listing_status",
    title: "Listing approved ✅",
    body: `'${updated.title}' is now live in the shop!`,
    href: "/sell",
  });
  // first-listing approval also approves the seller profile
  const seller = findById<User>("users", updated.sellerId);
  if (seller?.sellerProfile?.status === "pending") {
    updateById<User>("users", seller.id, (u) => ({
      ...u,
      sellerProfile: { ...u.sellerProfile!, status: "approved" },
    }));
  }
  return updated;
}

export async function requestChanges(
  id: string,
  note: string,
  admin: { id: string; name: string }
): Promise<Listing> {
  if (!note.trim()) throw new Error("A reason is required for 'Changes requested'.");
  const current = findById<Listing>("listings", id);
  if (!current) throw new Error("Listing not found");
  const updated = updateById<Listing>("listings", id, (l) => ({
    ...l,
    // edits to a live listing: reject the edit, keep old version live
    status: l.pendingEdit ? l.status : "changes_requested",
    pendingEdit: null,
    adminNote: note,
    updatedAt: nowIso(),
    statusHistory: [
      ...l.statusHistory,
      { status: "changes_requested", at: nowIso(), by: admin.id, note },
    ],
  }))!;
  await log(admin, "request_changes", "listing", id, note);
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
  const updated = updateById<Listing>("listings", id, (l) => ({
    ...l,
    status: "rejected",
    pendingEdit: null,
    adminNote: note,
    updatedAt: nowIso(),
    statusHistory: [
      ...l.statusHistory,
      { status: "rejected", at: nowIso(), by: admin.id, note },
    ],
  }));
  if (!updated) throw new Error("Listing not found");
  await log(admin, "reject_listing", "listing", id, note);
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
  const updated = updateById<Listing>("listings", id, (l) => ({
    ...l,
    status: "removed",
    adminNote: note,
    updatedAt: nowIso(),
    statusHistory: [
      ...l.statusHistory,
      { status: "removed", at: nowIso(), by: admin.id, note },
    ],
  }));
  if (!updated) throw new Error("Listing not found");
  await log(admin, "remove_listing", "listing", id, note);
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
      /* skip failures */
    }
  }
  return count;
}

// ---------------- users / sellers ----------------

export async function listUsers(): Promise<User[]> {
  return getAll<User>("users");
}

export async function listPendingSellers(): Promise<User[]> {
  return getAll<User>("users").filter(
    (u) => u.sellerProfile?.status === "pending"
  );
}

export async function approveSeller(
  userId: string,
  admin: { id: string; name: string }
): Promise<User> {
  const user = updateById<User>("users", userId, (u) => ({
    ...u,
    sellerProfile: u.sellerProfile
      ? { ...u.sellerProfile, status: "approved" as const }
      : u.sellerProfile,
  }));
  if (!user) throw new Error("User not found");
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
  const user = updateById<User>("users", userId, (u) => ({
    ...u,
    sellerProfile: u.sellerProfile
      ? { ...u.sellerProfile, verified }
      : u.sellerProfile,
  }));
  if (!user) throw new Error("User not found");
  await log(admin, verified ? "verify_seller" : "unverify_seller", "user", userId);
  if (verified) {
    await notify({
      userId,
      type: "system",
      title: "You're now a verified artist ✓",
      body: "The verified badge now shows on your profile and artworks.",
      href: "/sell",
    });
  }
  return user;
}

export async function suspendUser(
  userId: string,
  suspended: boolean,
  admin: { id: string; name: string },
  note?: string
): Promise<User> {
  const user = updateById<User>("users", userId, (u) => ({
    ...u,
    sellerProfile: u.sellerProfile
      ? { ...u.sellerProfile, suspended }
      : u.sellerProfile,
  }));
  if (!user) throw new Error("User not found");
  await log(admin, suspended ? "suspend_user" : "unsuspend_user", "user", userId, note);
  return user;
}

// ---------------- orders / commissions / reports / audit ----------------

export async function listAllOrders(): Promise<Order[]> {
  return getAll<Order>("orders").sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function refundOrder(
  id: string,
  admin: { id: string; name: string },
  note?: string
): Promise<Order> {
  const order = updateById<Order>("orders", id, (o) => ({
    ...o,
    status: "refunded",
    timeline: [...o.timeline, { status: "refunded", at: nowIso(), by: admin.id, note }],
  }));
  if (!order) throw new Error("Order not found");
  await log(admin, "refund_order", "order", id, note);
  await notify({
    userId: order.buyerId,
    type: "order_status",
    title: "Order refunded",
    body: note ?? "Your order was refunded by the studio.",
    href: `/account/orders/${order.id}`,
  });
  return order;
}

export async function listAllCommissions(): Promise<Commission[]> {
  return getAll<Commission>("commissions").sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function listReports(): Promise<Report[]> {
  return getAll<Report>("reports").sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function resolveReport(
  id: string,
  status: "resolved" | "dismissed",
  admin: { id: string; name: string },
  note?: string
): Promise<Report> {
  const report = updateById<Report>("reports", id, { status });
  if (!report) throw new Error("Report not found");
  await log(admin, `report_${status}`, "report", id, note);
  return report;
}

export async function listAudit(): Promise<AuditLogEntry[]> {
  return getAll<AuditLogEntry>("audit").sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function subscribeAdmin(cb: () => void): () => void {
  return subscribe("*", cb);
}
