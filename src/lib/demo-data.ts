// ============================================================
// Realistic sample data for DEMO MODE. The same data lives in
// supabase/seed.sql for live mode. Prices are stored in INR.
// ============================================================

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
import { DEFAULT_SHIPPING_RATES } from "@/lib/regions";

/** Bump to force a re-seed in every browser. */
export const SEED_VERSION = 3;

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

// ---------------- users ----------------

export const DEMO_IDS = {
  admin: "u_admin",
  buyer: "u_maya",
  seller: "u_arjun",
};

function seller(
  id: string,
  email: string,
  name: string,
  username: string,
  bio: string,
  country: string,
  avatar: number,
  verified: boolean,
  rating: number,
  ratingCount: number,
  daysAgo: number
): User {
  return {
    id,
    email,
    name,
    avatarUrl: `/avatars/avatar-${avatar}.svg`,
    role: "user",
    isSeller: true,
    sellerProfile: {
      displayName: name,
      username,
      bio,
      country,
      avatarUrl: `/avatars/avatar-${avatar}.svg`,
      payoutMethod: "UPI: demo@upi",
      verified,
      suspended: false,
      status: "approved",
      rating,
      ratingCount,
      createdAt: ago(daysAgo),
    },
    language: "en",
    currency: "INR",
    createdAt: ago(daysAgo),
  };
}

const users: User[] = [
  {
    id: DEMO_IDS.admin,
    email: "admin@demo.art",
    name: "Studio Admin",
    avatarUrl: "/avatars/avatar-7.svg",
    role: "admin",
    isSeller: false,
    language: "en",
    currency: "INR",
    createdAt: ago(400),
  },
  {
    id: DEMO_IDS.buyer,
    email: "maya@demo.art",
    name: "Maya Kapoor",
    avatarUrl: "/avatars/avatar-8.svg",
    role: "user",
    isSeller: false,
    language: "en",
    currency: "INR",
    createdAt: ago(120),
  },
  seller(
    DEMO_IDS.seller,
    "arjun@demo.art",
    "Arjun Mehta",
    "arjunmehta",
    "Oil painter from Jaipur. I chase warm evening light — old havelis, chai stalls and quiet streets.",
    "India",
    1,
    true,
    4.8,
    37,
    380
  ),
  seller(
    "u_priya",
    "priya@demo.art",
    "Priya Nair",
    "priyanair",
    "Watercolor artist in Kochi painting monsoon skies, backwaters and everything green.",
    "India",
    2,
    true,
    4.9,
    52,
    300
  ),
  seller(
    "u_sofia",
    "sofia@demo.art",
    "Sofia Marchetti",
    "sofiamarchetti",
    "Florence-based illustrator mixing ink and digital. Portraits with a storybook soul.",
    "Italy",
    3,
    true,
    4.7,
    24,
    260
  ),
  seller(
    "u_kenji",
    "kenji@demo.art",
    "Kenji Watanabe",
    "kenjiwatanabe",
    "Minimal landscapes and still lifes from Kyoto. Acrylic, quiet colours, lots of negative space.",
    "Japan",
    4,
    false,
    4.6,
    18,
    200
  ),
  seller(
    "u_elena",
    "elena@demo.art",
    "Elena Volkova",
    "elenavolkova",
    "Charcoal and pencil artist. I draw people the way they look when nobody is watching.",
    "Germany",
    5,
    true,
    4.9,
    41,
    340
  ),
  seller(
    "u_david",
    "david@demo.art",
    "David Osei",
    "davidosei",
    "Abstract painter from Accra — bold shapes, market colours, rhythm on canvas.",
    "Ghana",
    6,
    false,
    4.5,
    9,
    90
  ),
];

// ---------------- listings ----------------

interface L {
  n: number;
  sellerId: string;
  title: string;
  slug: string;
  description: string;
  category: Listing["category"];
  medium: Listing["medium"];
  w: number;
  h: number;
  price: number;
  kind: "physical" | "digital";
  status: Listing["status"];
  featured?: boolean;
  adminNote?: string;
  rating?: [number, number];
  days: number;
}

const L_DATA: L[] = [
  { n: 1, sellerId: "u_david", title: "Market Morning", slug: "market-morning", description: "Bold abstract shapes inspired by the morning rush of Makola market — terracotta stalls, mustard sunlight and the hum of a city waking up. Painted in layered acrylic with palette-knife texture.", category: "abstract", medium: "acrylic", w: 60, h: 75, price: 18500, kind: "physical", status: "approved", featured: true, rating: [4.7, 6], days: 85 },
  { n: 2, sellerId: "u_priya", title: "Monsoon over the Backwaters", slug: "monsoon-over-the-backwaters", description: "A watercolor of the first monsoon clouds rolling over Kerala's backwaters. Sage palms lean into the wind while the water keeps the last of the morning gold.", category: "landscape", medium: "watercolor", w: 36, h: 48, price: 9200, kind: "physical", status: "approved", featured: true, rating: [4.9, 11], days: 78 },
  { n: 3, sellerId: "u_sofia", title: "The Letter She Never Sent", slug: "the-letter-she-never-sent", description: "Ink and digital portrait of a woman caught mid-thought, a letter folded in her hands. Part of my 'Quiet Stories' series.", category: "portrait", medium: "digital", w: 30, h: 40, price: 6500, kind: "digital", status: "approved", featured: true, rating: [4.8, 9], days: 70 },
  { n: 4, sellerId: "u_kenji", title: "Tea Bowl and Persimmons", slug: "tea-bowl-and-persimmons", description: "A quiet still life — one tea bowl, three persimmons, afternoon light. Acrylic on linen with a matte finish.", category: "still_life", medium: "acrylic", w: 40, h: 50, price: 14000, kind: "physical", status: "approved", rating: [4.6, 5], days: 66 },
  { n: 5, sellerId: DEMO_IDS.seller, title: "Haveli at Dusk", slug: "haveli-at-dusk", description: "Oil painting of a crumbling Jaipur haveli as the streetlamps flicker on. Thick impasto skies in terracotta and deep amber — my favourite hour to paint.", category: "painting", medium: "oil", w: 61, h: 76, price: 24500, kind: "physical", status: "approved", featured: true, rating: [4.9, 14], days: 60 },
  { n: 6, sellerId: "u_elena", title: "Study of Hands III", slug: "study-of-hands-iii", description: "Charcoal study of my grandmother's hands, resting after kneading dough. Fixative-sealed on heavy archival paper.", category: "sketch", medium: "charcoal", w: 28, h: 36, price: 5400, kind: "physical", status: "approved", rating: [5, 8], days: 55 },
  { n: 7, sellerId: "u_priya", title: "Paddy Fields, First Light", slug: "paddy-fields-first-light", description: "Layered watercolor washes of young paddy at dawn — twenty shades of green before the sun burns the mist away.", category: "landscape", medium: "watercolor", w: 56, h: 76, price: 15800, kind: "physical", status: "approved", rating: [4.8, 7], days: 50 },
  { n: 8, sellerId: "u_sofia", title: "Cartographer's Daughter", slug: "cartographers-daughter", description: "Digital illustration of a girl drawing maps of places that don't exist yet. High-res file delivered instantly after purchase.", category: "digital", medium: "digital", w: 30, h: 40, price: 4800, kind: "digital", status: "approved", rating: [4.7, 12], days: 45 },
  { n: 9, sellerId: DEMO_IDS.seller, title: "Chai Stall on Mirza Road", slug: "chai-stall-on-mirza-road", description: "Small oil sketch of the chai stall below my studio. Steam, brass kettles, and the one regular who never leaves.", category: "painting", medium: "oil", w: 25, h: 30, price: 8200, kind: "physical", status: "approved", rating: [4.9, 10], days: 40 },
  { n: 10, sellerId: "u_kenji", title: "Winter Garden, Kyoto", slug: "winter-garden-kyoto", description: "A near-empty garden under thin snow. Acrylic, mostly whites and one stubborn green pine.", category: "landscape", medium: "acrylic", w: 50, h: 65, price: 17500, kind: "physical", status: "approved", rating: [4.5, 4], days: 35 },
  { n: 11, sellerId: "u_elena", title: "Portrait of a Stranger on the U8", slug: "portrait-of-a-stranger-on-the-u8", description: "Pencil portrait drawn from memory after a late-night Berlin train ride. Graphite on toned paper.", category: "portrait", medium: "pencil", w: 24, h: 32, price: 4200, kind: "physical", status: "approved", rating: [4.8, 6], days: 30 },
  { n: 12, sellerId: "u_david", title: "Rhythm No. 7", slug: "rhythm-no-7", description: "Seventh in my rhythm series — highlife music translated into moving colour. Acrylic and oil pastel.", category: "abstract", medium: "mixed_media", w: 80, h: 100, price: 32000, kind: "physical", status: "approved", rating: [4.6, 3], days: 25 },
  { n: 13, sellerId: DEMO_IDS.seller, title: "Blue Door, Old City", slug: "blue-door-old-city", description: "A weathered indigo door in Jaipur's old quarter, framed by terracotta walls. Oil on canvas board.", category: "painting", medium: "oil", w: 30, h: 40, price: 9800, kind: "physical", status: "pending", days: 2 },
  { n: 14, sellerId: "u_david", title: "Night Market Study", slug: "night-market-study", description: "Quick acrylic study of lantern light at the night market.", category: "abstract", medium: "acrylic", w: 30, h: 40, price: 7600, kind: "physical", status: "pending", days: 1 },
  { n: 15, sellerId: "u_kenji", title: "Bamboo After Rain", slug: "bamboo-after-rain", description: "Ink study of bamboo, still dripping.", category: "sketch", medium: "ink", w: 26, h: 36, price: 5200, kind: "physical", status: "changes_requested", adminNote: "Lovely work! Please add a photo of the artwork in natural light and mention whether it ships framed or unframed.", days: 4 },
  { n: 16, sellerId: "u_priya", title: "Harbour Sketchbook Page", slug: "harbour-sketchbook-page", description: "A loose page from my harbour sketchbook — fishing boats at rest.", category: "sketch", medium: "watercolor", w: 21, h: 29, price: 2600, kind: "digital", status: "approved", rating: [4.4, 2], days: 18 },
];

const listings: Listing[] = L_DATA.map((d) => {
  const img = `/art/art-${String(d.n).padStart(2, "0")}.svg`;
  const history: Listing["statusHistory"] = [
    { status: "draft", at: ago(d.days + 2) },
    { status: "pending", at: ago(d.days + 1), by: d.sellerId },
  ];
  if (d.status === "approved") {
    history.push({ status: "approved", at: ago(d.days), by: DEMO_IDS.admin, note: "Welcome to the gallery!" });
  } else if (d.status === "changes_requested") {
    history.push({ status: "changes_requested", at: ago(d.days), by: DEMO_IDS.admin, note: d.adminNote });
  }
  return {
    id: `l_${String(d.n).padStart(2, "0")}`,
    slug: d.slug,
    sellerId: d.sellerId,
    title: d.title,
    description: d.description,
    category: d.category,
    medium: d.medium,
    widthCm: d.w,
    heightCm: d.h,
    priceInr: d.price,
    kind: d.kind,
    images: [img],
    fullResUrl: img,
    status: d.status,
    adminNote: d.adminNote,
    statusHistory: history,
    shipsTo: d.kind === "digital" ? [] : ["india", "asia", "europe", "north_america", "rest_of_world"],
    shippingRates: d.kind === "digital" ? [] : DEFAULT_SHIPPING_RATES,
    stock: 1,
    featured: Boolean(d.featured),
    pendingEdit: null,
    ratingAvg: d.rating?.[0] ?? 0,
    ratingCount: d.rating?.[1] ?? 0,
    createdAt: ago(d.days + 2),
    updatedAt: ago(d.days),
  };
});

// ---------------- orders ----------------

const orders: Order[] = [
  {
    id: "o_1001",
    buyerId: DEMO_IDS.buyer,
    items: [
      {
        listingId: "l_06",
        sellerId: "u_elena",
        title: "Study of Hands III",
        image: "/art/art-06.svg",
        kind: "physical",
        priceInr: 5400,
        qty: 1,
      },
    ],
    shippingAddress: {
      fullName: "Maya Kapoor",
      line1: "14 Lotus Apartments, MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      phone: "+91 98765 43210",
    },
    shippingInr: 2000,
    subtotalInr: 5400,
    totalInr: 7400,
    displayCurrency: "INR",
    displayTotal: 7400,
    commissionPercent: 10,
    status: "shipped",
    trackingNumber: "DEMO-TRACK-88412",
    paymentProvider: "demo",
    paymentId: "pay_demo_1001",
    timeline: [
      { status: "placed", at: ago(12) },
      { status: "paid", at: ago(12) },
      { status: "shipped", at: ago(9), note: "Tracking: DEMO-TRACK-88412" },
    ],
    createdAt: ago(12),
  },
  {
    id: "o_1002",
    buyerId: DEMO_IDS.buyer,
    items: [
      {
        listingId: "l_08",
        sellerId: "u_sofia",
        title: "Cartographer's Daughter",
        image: "/art/art-08.svg",
        kind: "digital",
        priceInr: 4800,
        qty: 1,
        downloadUrl: "/art/art-08.svg",
      },
    ],
    shippingInr: 0,
    subtotalInr: 4800,
    totalInr: 4800,
    displayCurrency: "INR",
    displayTotal: 4800,
    commissionPercent: 10,
    status: "delivered",
    paymentProvider: "demo",
    paymentId: "pay_demo_1002",
    timeline: [
      { status: "placed", at: ago(30) },
      { status: "paid", at: ago(30) },
      { status: "delivered", at: ago(30), note: "Digital download unlocked" },
    ],
    createdAt: ago(30),
  },
];

// ---------------- commissions ----------------

const commissions: Commission[] = [
  {
    id: "c_2001",
    buyerId: DEMO_IDS.buyer,
    artistId: DEMO_IDS.seller,
    title: "Our family home in Shimla",
    description:
      "I'd love an oil painting of my grandparents' house in Shimla — a green-roofed cottage with deodars behind it. Warm evening light like your haveli series. I've attached two photos.",
    medium: "oil",
    size: "50 × 70 cm",
    style: "Warm, impressionistic, like 'Haveli at Dusk'",
    budgetMinInr: 15000,
    budgetMaxInr: 25000,
    deadline: new Date(Date.now() + 45 * DAY).toISOString(),
    referenceImages: ["/art/art-10.svg"],
    sketchImage: undefined,
    status: "in_progress",
    quoteInr: 21000,
    quoteNote: "Happy to take this on! 50×70 oil on canvas, 4–5 weeks including drying time.",
    depositPercent: 40,
    depositPaidInr: 8400,
    wipImages: [
      { url: "/art/art-05.svg", note: "Underpainting done — blocking in the big evening shapes.", at: ago(3) },
    ],
    timeline: [
      { status: "submitted", at: ago(10) },
      { status: "quote_sent", at: ago(8), note: "Quote: ₹21,000" },
      { status: "accepted", at: ago(7) },
      { status: "deposit_paid", at: ago(7), note: "Deposit ₹8,400 (40%)" },
      { status: "in_progress", at: ago(6) },
    ],
    createdAt: ago(10),
  },
  {
    id: "c_2002",
    buyerId: DEMO_IDS.buyer,
    artistId: null,
    title: "Watercolor of my dog Biscuit",
    description:
      "A small watercolor portrait of my golden retriever, Biscuit. Something loose and happy.",
    medium: "watercolor",
    size: "30 × 40 cm",
    style: "Loose, splashy",
    budgetMinInr: 4000,
    budgetMaxInr: 8000,
    referenceImages: [],
    status: "submitted",
    depositPercent: 40,
    wipImages: [],
    timeline: [{ status: "submitted", at: ago(1), note: "Studio will match an artist" }],
    createdAt: ago(1),
  },
];

// ---------------- messages ----------------

const threads: MessageThread[] = [
  {
    id: "t_3001",
    participantIds: [DEMO_IDS.buyer, DEMO_IDS.seller],
    participantNames: {
      [DEMO_IDS.buyer]: "Maya Kapoor",
      [DEMO_IDS.seller]: "Arjun Mehta",
    },
    context: { type: "commission", id: "c_2001" },
    contextLabel: "Commission: Our family home in Shimla",
    lastMessageAt: ago(3),
    lastMessagePreview: "Underpainting is done — here's where it stands.",
    unreadBy: [DEMO_IDS.buyer],
    createdAt: ago(10),
  },
];

const messages: ChatMessage[] = [
  {
    id: "m_1",
    threadId: "t_3001",
    senderId: DEMO_IDS.buyer,
    senderName: "Maya Kapoor",
    text: "Hi Arjun! So excited you took this on. The deodar trees are the most important part for me.",
    createdAt: ago(7),
  },
  {
    id: "m_2",
    threadId: "t_3001",
    senderId: DEMO_IDS.seller,
    senderName: "Arjun Mehta",
    text: "Noted! I'll keep them tall and a little wild, the way they look in your photo.",
    createdAt: ago(6),
  },
  {
    id: "m_3",
    threadId: "t_3001",
    senderId: DEMO_IDS.seller,
    senderName: "Arjun Mehta",
    text: "Underpainting is done — here's where it stands.",
    imageUrl: "/art/art-05.svg",
    createdAt: ago(3),
  },
];

// ---------------- notifications ----------------

const notifications: Notification[] = [
  {
    id: "n_1",
    userId: DEMO_IDS.buyer,
    type: "commission_status",
    title: "Work in progress on your commission",
    body: "Arjun shared a progress image on 'Our family home in Shimla'.",
    href: "/account/commissions/c_2001",
    read: false,
    createdAt: ago(3),
  },
  {
    id: "n_2",
    userId: DEMO_IDS.buyer,
    type: "order_status",
    title: "Your order has shipped",
    body: "'Study of Hands III' is on its way. Tracking: DEMO-TRACK-88412",
    href: "/account/orders/o_1001",
    read: false,
    createdAt: ago(9),
  },
  {
    id: "n_3",
    userId: DEMO_IDS.seller,
    type: "listing_status",
    title: "Listing submitted for review",
    body: "'Blue Door, Old City' is waiting for admin approval.",
    href: "/sell",
    read: true,
    createdAt: ago(2),
  },
];

// ---------------- reviews ----------------

const reviews: Review[] = [
  {
    id: "r_1",
    listingId: "l_08",
    orderId: "o_1002",
    buyerId: DEMO_IDS.buyer,
    buyerName: "Maya Kapoor",
    rating: 5,
    text: "The file arrived instantly and the detail is gorgeous printed at A2. Sofia even sent a little thank-you note.",
    createdAt: ago(28),
  },
  {
    id: "r_2",
    listingId: "l_05",
    orderId: "o_demo_past",
    buyerId: "u_priya",
    buyerName: "Priya Nair",
    rating: 5,
    text: "I own one of Arjun's dusk paintings and it makes the whole room feel warmer.",
    createdAt: ago(45),
  },
];

// ---------------- reports / audit ----------------

const reports: Report[] = [
  {
    id: "rep_1",
    targetType: "listing",
    targetId: "l_12",
    targetLabel: "Rhythm No. 7",
    reporterId: DEMO_IDS.buyer,
    reason: "Sample report: possible duplicate listing (demo data).",
    status: "open",
    createdAt: ago(5),
  },
];

const audit: AuditLogEntry[] = [
  {
    id: "a_1",
    adminId: DEMO_IDS.admin,
    adminName: "Studio Admin",
    action: "approve_listing",
    targetType: "listing",
    targetId: "l_05",
    note: "Welcome to the gallery!",
    createdAt: ago(60),
  },
  {
    id: "a_2",
    adminId: DEMO_IDS.admin,
    adminName: "Studio Admin",
    action: "request_changes",
    targetType: "listing",
    targetId: "l_15",
    note: "Lovely work! Please add a photo in natural light.",
    createdAt: ago(4),
  },
];

const wishlists = [{ id: DEMO_IDS.buyer, listingIds: ["l_05", "l_02"] }];

export function seedData() {
  return {
    users,
    listings,
    orders,
    commissions,
    threads,
    messages,
    notifications,
    reviews,
    reports,
    audit,
    wishlists,
  };
}
