// ============================================================
// Shared domain types used by every service implementation
// (local/demo and supabase) and by the UI.
// ============================================================

export type Role = "user" | "admin";

export type Currency = "INR" | "USD" | "EUR" | "GBP";

export type Locale = "en" | "hi";

export type ShippingRegion =
  | "india"
  | "asia"
  | "europe"
  | "north_america"
  | "rest_of_world";

export interface SellerProfile {
  displayName: string;
  username: string;
  bio: string;
  country: string;
  avatarUrl: string;
  payoutMethod: string; // e.g. "UPI: name@bank" or "Bank transfer"
  verified: boolean;
  suspended: boolean;
  status: "pending" | "approved" | "rejected";
  rating: number; // average
  ratingCount: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: Role;
  isSeller: boolean;
  sellerProfile?: SellerProfile;
  language: Locale;
  currency: Currency;
  createdAt: string;
}

export type ListingStatus =
  | "draft"
  | "pending"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "sold"
  | "paused"
  | "removed";

export type ArtCategory =
  | "painting"
  | "sketch"
  | "digital"
  | "portrait"
  | "abstract"
  | "landscape"
  | "still_life";

export type ArtMedium =
  | "oil"
  | "acrylic"
  | "watercolor"
  | "pencil"
  | "charcoal"
  | "ink"
  | "digital"
  | "mixed_media";

export interface StatusEvent {
  status: string;
  note?: string;
  by?: string; // user id
  at: string; // ISO date
}

export interface ShippingRate {
  region: ShippingRegion;
  rateInr: number;
}

/** Edits to an approved listing wait here until re-approved. */
export interface ListingEdit {
  title: string;
  description: string;
  priceInr: number;
  images: string[];
  submittedAt: string;
}

export interface Listing {
  id: string;
  slug: string;
  sellerId: string;
  title: string;
  description: string;
  category: ArtCategory;
  medium: ArtMedium;
  widthCm: number;
  heightCm: number;
  priceInr: number;
  kind: "physical" | "digital";
  images: string[]; // first is the cover
  /** For digital art: delivered after purchase. In demo mode same as image. */
  fullResUrl?: string;
  status: ListingStatus;
  adminNote?: string;
  statusHistory: StatusEvent[];
  shipsTo: ShippingRegion[];
  shippingRates: ShippingRate[];
  stock: number;
  featured: boolean;
  pendingEdit?: ListingEdit | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  listingId: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  rating: number; // 1..5
  text: string;
  createdAt: string;
}

export interface CartItem {
  listingId: string;
  qty: number;
}

export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export type OrderStatus =
  | "placed"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  listingId: string;
  sellerId: string;
  title: string;
  image: string;
  kind: "physical" | "digital";
  priceInr: number;
  qty: number;
  /** set after payment for digital items */
  downloadUrl?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  items: OrderItem[];
  shippingAddress?: Address;
  shippingInr: number;
  subtotalInr: number;
  totalInr: number;
  /** what the buyer saw/paid in their currency */
  displayCurrency: Currency;
  displayTotal: number;
  commissionPercent: number;
  status: OrderStatus;
  trackingNumber?: string;
  paymentProvider: "razorpay" | "paypal" | "demo";
  paymentId?: string;
  timeline: StatusEvent[];
  createdAt: string;
}

export type CommissionStatus =
  | "submitted"
  | "quote_sent"
  | "accepted"
  | "deposit_paid"
  | "in_progress"
  | "ready"
  | "final_paid"
  | "delivered"
  | "declined"
  | "cancelled";

export interface Commission {
  id: string;
  buyerId: string;
  /** null = "let the studio choose"; admin assigns later */
  artistId: string | null;
  title: string;
  description: string;
  medium: ArtMedium;
  size: string;
  style: string;
  budgetMinInr: number;
  budgetMaxInr: number;
  deadline?: string;
  referenceImages: string[];
  sketchImage?: string;
  status: CommissionStatus;
  quoteInr?: number;
  quoteNote?: string;
  depositPercent: number;
  depositPaidInr?: number;
  finalPaidInr?: number;
  wipImages: { url: string; note?: string; at: string }[];
  timeline: StatusEvent[];
  createdAt: string;
}

export type ThreadContext =
  | { type: "artwork"; id: string }
  | { type: "order"; id: string }
  | { type: "commission"; id: string }
  | { type: "general"; id: string };

export interface MessageThread {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  context: ThreadContext;
  contextLabel: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadBy: string[]; // user ids with unread messages
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  /** id of the message this one replies to */
  replyToId?: string;
  /** one reaction per person: userId -> emoji */
  reactions?: Record<string, string>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "listing_status"
    | "order_status"
    | "commission_status"
    | "message"
    | "system";
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  targetType: "listing" | "user";
  targetId: string;
  targetLabel: string;
  reporterId: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  note?: string;
  createdAt: string;
}

export interface AdminStats {
  pendingListings: number;
  pendingSellers: number;
  openReports: number;
  totalSalesInr: number;
  commissionEarnedInr: number;
  orderCount: number;
  userCount: number;
  topArtists: { id: string; name: string; salesInr: number }[];
}

// -------------------- filters --------------------

export interface ShopFilters {
  search?: string;
  category?: ArtCategory | "all";
  medium?: ArtMedium | "all";
  priceMinInr?: number;
  priceMaxInr?: number;
  size?: "small" | "medium" | "large" | "all";
  artistId?: string;
  shipsToRegion?: ShippingRegion | "all";
  kind?: "physical" | "digital" | "all";
  sort?: "newest" | "price_asc" | "price_desc" | "rating";
}

export interface ArtistSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  country: string;
  verified: boolean;
  rating: number;
  ratingCount: number;
  artworkCount: number;
}
