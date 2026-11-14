// Maps snake_case Supabase rows <-> the camelCase domain types.
// Nested arrays/objects (images, timelines, rates) are stored as jsonb.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Commission,
  Listing,
  MessageThread,
  ChatMessage,
  Notification,
  Order,
  Report,
  Review,
  User,
  AuditLogEntry,
} from "@/types";

export function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email ?? "",
    name: row.name ?? "",
    avatarUrl: row.avatar_url ?? "",
    role: row.role ?? "user",
    isSeller: row.is_seller ?? false,
    sellerProfile: row.seller_profile ?? undefined,
    language: row.language ?? "en",
    currency: row.currency ?? "INR",
    createdAt: row.created_at,
  };
}

export function mapListing(row: any): Listing {
  return {
    id: row.id,
    slug: row.slug,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    medium: row.medium,
    widthCm: Number(row.width_cm ?? 0),
    heightCm: Number(row.height_cm ?? 0),
    priceInr: Number(row.price_inr ?? 0),
    kind: row.kind,
    images: row.images ?? [],
    fullResUrl: row.full_res_url ?? undefined,
    status: row.status,
    adminNote: row.admin_note ?? undefined,
    statusHistory: row.status_history ?? [],
    shipsTo: row.ships_to ?? [],
    shippingRates: row.shipping_rates ?? [],
    stock: Number(row.stock ?? 0),
    featured: row.featured ?? false,
    pendingEdit: row.pending_edit ?? null,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function listingToRow(l: Partial<Listing>): any {
  const row: any = {};
  if (l.id !== undefined) row.id = l.id;
  if (l.slug !== undefined) row.slug = l.slug;
  if (l.sellerId !== undefined) row.seller_id = l.sellerId;
  if (l.title !== undefined) row.title = l.title;
  if (l.description !== undefined) row.description = l.description;
  if (l.category !== undefined) row.category = l.category;
  if (l.medium !== undefined) row.medium = l.medium;
  if (l.widthCm !== undefined) row.width_cm = l.widthCm;
  if (l.heightCm !== undefined) row.height_cm = l.heightCm;
  if (l.priceInr !== undefined) row.price_inr = l.priceInr;
  if (l.kind !== undefined) row.kind = l.kind;
  if (l.images !== undefined) row.images = l.images;
  if (l.fullResUrl !== undefined) row.full_res_url = l.fullResUrl;
  if (l.status !== undefined) row.status = l.status;
  if (l.adminNote !== undefined) row.admin_note = l.adminNote;
  if (l.statusHistory !== undefined) row.status_history = l.statusHistory;
  if (l.shipsTo !== undefined) row.ships_to = l.shipsTo;
  if (l.shippingRates !== undefined) row.shipping_rates = l.shippingRates;
  if (l.stock !== undefined) row.stock = l.stock;
  if (l.featured !== undefined) row.featured = l.featured;
  if (l.pendingEdit !== undefined) row.pending_edit = l.pendingEdit;
  if (l.ratingAvg !== undefined) row.rating_avg = l.ratingAvg;
  if (l.ratingCount !== undefined) row.rating_count = l.ratingCount;
  return row;
}

export function mapOrder(row: any): Order {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    items: row.items ?? [],
    shippingAddress: row.shipping_address ?? undefined,
    shippingInr: Number(row.shipping_inr ?? 0),
    subtotalInr: Number(row.subtotal_inr ?? 0),
    totalInr: Number(row.total_inr ?? 0),
    displayCurrency: row.display_currency ?? "INR",
    displayTotal: Number(row.display_total ?? 0),
    commissionPercent: Number(row.commission_percent ?? 10),
    status: row.status,
    trackingNumber: row.tracking_number ?? undefined,
    paymentProvider: row.payment_provider ?? "demo",
    paymentId: row.payment_id ?? undefined,
    timeline: row.timeline ?? [],
    createdAt: row.created_at,
  };
}

export function mapCommission(row: any): Commission {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    artistId: row.artist_id ?? null,
    title: row.title,
    description: row.description ?? "",
    medium: row.medium,
    size: row.size ?? "",
    style: row.style ?? "",
    budgetMinInr: Number(row.budget_min_inr ?? 0),
    budgetMaxInr: Number(row.budget_max_inr ?? 0),
    deadline: row.deadline ?? undefined,
    referenceImages: row.reference_images ?? [],
    sketchImage: row.sketch_image ?? undefined,
    status: row.status,
    quoteInr: row.quote_inr != null ? Number(row.quote_inr) : undefined,
    quoteNote: row.quote_note ?? undefined,
    depositPercent: Number(row.deposit_percent ?? 40),
    depositPaidInr: row.deposit_paid_inr != null ? Number(row.deposit_paid_inr) : undefined,
    finalPaidInr: row.final_paid_inr != null ? Number(row.final_paid_inr) : undefined,
    wipImages: row.wip_images ?? [],
    timeline: row.timeline ?? [],
    createdAt: row.created_at,
  };
}

export function mapThread(row: any): MessageThread {
  return {
    id: row.id,
    participantIds: row.participant_ids ?? [],
    participantNames: row.participant_names ?? {},
    context: row.context ?? { type: "general", id: "" },
    contextLabel: row.context_label ?? "",
    lastMessageAt: row.last_message_at ?? row.created_at,
    lastMessagePreview: row.last_message_preview ?? "",
    unreadBy: row.unread_by ?? [],
    createdAt: row.created_at,
  };
}

export function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? "",
    text: row.text ?? "",
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body ?? "",
    href: row.href ?? "/",
    read: row.read ?? false,
    createdAt: row.created_at,
  };
}

export function mapReview(row: any): Review {
  return {
    id: row.id,
    listingId: row.listing_id,
    orderId: row.order_id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name ?? "",
    rating: Number(row.rating ?? 0),
    text: row.text ?? "",
    createdAt: row.created_at,
  };
}

export function mapReport(row: any): Report {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label ?? "",
    reporterId: row.reporter_id,
    reason: row.reason ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapAudit(row: any): AuditLogEntry {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name ?? "",
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}
