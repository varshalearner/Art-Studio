Build a complete, production-ready, responsive web app for a cozy online art studio and marketplace called "[YOUR STUDIO NAME]". Anyone in the world can buy art, sell their own art (after admin approval), and commission custom paintings. It must work fully in DEMO MODE with zero API keys, and switch to a real backend just by adding keys later. It will be deployed on Vercel.

====================================================================
## 1. Tech stack (use exactly this)
====================================================================
- Next.js (App Router) + TypeScript, deployed on Vercel
- Tailwind CSS + shadcn/ui, Framer Motion for animations
- Supabase: Auth (email + Google), Postgres with Row Level Security, Storage, Realtime (chat + live status updates)
- Sketch canvas: HTML Canvas with perfect-freehand (pointer events, mouse + touch + stylus)
- Payments: Razorpay (India + international cards, UPI) + PayPal for foreign buyers. Order creation, signature verification and webhooks run in Next.js API routes (server-side only)
- React Hook Form + Zod for forms, TanStack Query for data fetching
- next-intl for i18n (English + Hindi, easy to add more)
- Resend for transactional emails
- Playwright E2E tests + Vitest unit tests
- Vercel Analytics + Sentry for monitoring

====================================================================
## 2. Vibe & design (very important)
====================================================================
- Cozy, warm, hand-crafted feel, like a sunlit artist's attic studio. NOT a generic e-commerce template.
- Palette: warm cream/paper background (#FAF6EF-ish), terracotta, sage green, mustard and soft charcoal accents. Subtle paper/canvas grain texture.
- Typography: a soft serif or handwritten-feel display font for headings (e.g. Fraunces, with Caveat for small accents) + a clean readable sans for body (e.g. Nunito or Inter).
- Rounded corners, soft shadows, gentle hover animations (cards lift slightly, like picking up a painting).
- Hand-drawn touches: doodle underlines, brush-stroke dividers, little paint-splash and pencil icons.
- Dark mode with a "night studio" look (deep warm brown, lamp-glow accents).
- Mobile-first and fully responsive.
- Friendly empty and loading states (e.g. "Your easel is empty — let's find something you love").
- Accessible: alt text, keyboard navigation, good contrast, visible focus states.

====================================================================
## 3. Who can do what
====================================================================
- Guests can browse the shop, artworks and artist pages.
- Any registered user can buy, sell AND request commissions from the same account. There is no separate artist account: a user clicks "Start Selling", fills a short seller profile (display name, bio, country, profile photo, payout details), and becomes a seller.
- Login is required to buy, sell, message or request a commission.
- Roles: user (buyer + seller) and admin. Admin role is set only in the database, never from the UI.

====================================================================
## 4. Pages & features
====================================================================

### 4.1 Home
- Hero with a warm welcome line and three buttons: "Browse Art", "Start Selling", "Commission a Painting".
- Featured artworks, featured artists, and a "How commissions work" section (3 illustrated steps).
- Testimonials section (sample text, clearly marked as sample in demo mode).

### 4.2 Shop / Gallery (Buy)
- Grid of approved artworks: image, title, artist, price (in the user's currency), medium, size.
- Filters: category (painting, sketch, digital, portrait, abstract, etc.), price range, medium, size, artist, ships-to-my-country. Search and sorting.
- Artwork detail page: large zoomable image (watermarked preview), description, artist info with verified badge, ratings & reviews, "Add to Cart", "Add to Wishlist", "Message Artist", "Report".
- Physical artworks and digital artworks (digital = instant high-res download after payment, no shipping).
- Cart and checkout: shipping address, shipping cost by region, currency, Razorpay / PayPal payment.

### 4.3 Sell (with admin approval)
- Seller dashboard: My Listings, Orders to fulfil, Commission requests, Earnings, Payout history.
- Upload artwork form: multiple images, title, description, category, medium, size, price, physical or digital, shipping regions and rates, stock/availability.

### 4.4 Commission a painting (key feature)
Customers can describe what they want in THREE ways, which can be combined:
a) Upload reference photos: drag-and-drop, previews, multiple images.
b) Write a message: description, size, medium (oil, acrylic, watercolor, pencil, digital), style, budget range, deadline.
c) Draw on screen: a built-in sketch canvas.
   - Tools: brush, pencil, eraser, color picker, brush size slider, undo/redo, clear, fill.
   - Smooth lines with mouse, touch and stylus.
   - Option to draw ON TOP of an uploaded reference photo (photo as a background layer).
   - Save the sketch as an image attached to the request.
- Choose a specific artist or "let the studio choose".
- Artist sends a quote, the customer accepts, pays an advance deposit (configurable %, e.g. 40%), and pays the rest on completion.
- Artist can share work-in-progress images for feedback.

### 4.5 Messages
- Real-time chat between buyer and seller, per artwork, order or commission.
- Image attachments, and the ability to send a sketch from the canvas.

### 4.6 User account
- Profile, orders, wishlist, my commission requests, notifications, settings (language, currency, dark mode).

### 4.7 Other pages
- About the studio, FAQ, Contact.
- Legal pages as editable templates: Privacy Policy, Terms of Service, Refund & Return Policy, Shipping Policy.
- GDPR cookie consent banner.

====================================================================
## 5. Listing approval workflow (selling requires admin approval)
====================================================================
- A newly uploaded artwork is NOT public. Statuses:
  Draft → Pending Review → Approved (Live) / Changes Requested / Rejected
  Live listings can later become: Sold, Paused (by seller) or Removed (by admin).
- The admin must give a reason for "Changes Requested" or "Rejected", and the seller sees it.
- If a seller edits an approved listing's images, title, price or description, the edit goes to Pending Review. The old approved version stays live until the new one is approved.
- Only Approved listings appear in the shop, search, artist pages and sitemap. Enforce this with Supabase RLS, not only in the UI.
- A new seller's first listing also triggers a seller-profile review. Admin can mark sellers "Verified" (badge) or suspend them.

====================================================================
## 6. Status visible to the user
====================================================================
- "My Listings" shows colour-coded status badges (Pending = mustard, Approved = sage green, Changes Requested = terracotta, Rejected = grey), the admin's note, and a small timeline of status changes with dates.
- Orders timeline: Placed → Paid → Shipped (tracking number) → Delivered.
- Commissions timeline: Submitted → Quote Sent → Accepted → Deposit Paid → In Progress → Ready → Final Paid → Delivered.
- In-app notification bell + email (Resend) on every status change and new message.
- Status updates appear live via Supabase Realtime.

====================================================================
## 7. Admin panel
====================================================================
- Review queue for pending listings and seller profiles: full images, details, seller info, Approve / Request Changes / Reject buttons with a note field, and bulk approve.
- Manage users and sellers (verify, suspend), orders, commissions, reports/flags, refunds and disputes.
- Overview: pending count, sales, platform commission earned, top artists.
- All admin actions are logged (who, what, when).

====================================================================
## 8. Global / international
====================================================================
- Multi-currency prices (INR, USD, EUR, GBP), auto-detected by location, with a manual switcher. Exchange rates come from a free exchange-rate API, cached once a day. The base price is stored in INR.
- English + Hindi via next-intl, structured so more languages can be added easily.
- Domestic and international shipping rates by region; sellers choose which regions they ship to.
- All dates and deadlines shown in the user's local time zone.
- Marketplace split payments: the buyer pays the platform, and the seller receives the amount minus a configurable platform commission % (Razorpay Route or equivalent; mock in demo mode).

====================================================================
## 9. Trust & safety
====================================================================
- Artist verification badge, ratings & reviews (only after a completed purchase), report button.
- Automatic watermark on preview images. The full-resolution file is delivered only after purchase.
- Rate limiting on uploads, messages and commission requests.

====================================================================
## 10. Plug-and-play backend (VERY IMPORTANT)
====================================================================
The app must work fully RIGHT NOW without any API keys, and switch to the real backend just by adding keys, with no code changes.

1. Two modes, auto-detected per service:
   - DEMO MODE (keys missing): all data in localStorage with realistic sample data (artworks, artists, prices in INR); mock login (with a "log in as admin" demo button); mock payments. Show a small friendly banner: "Demo mode — connect Supabase to go live".
   - LIVE MODE (keys present): real Supabase auth, database, storage and realtime; real Razorpay/PayPal.
   Each service switches independently (e.g. Supabase live while payments are still mock).

2. Single config place:
   - A `.env.example` file listing every key, with comments explaining where to get it:
     NEXT_PUBLIC_SUPABASE_URL=
     NEXT_PUBLIC_SUPABASE_ANON_KEY=
     NEXT_PUBLIC_RAZORPAY_KEY_ID=
     NEXT_PUBLIC_PAYPAL_CLIENT_ID=
     NEXT_PUBLIC_SITE_NAME=
     NEXT_PUBLIC_SITE_URL=
     NEXT_PUBLIC_DEFAULT_CURRENCY=INR
     NEXT_PUBLIC_PLATFORM_COMMISSION_PERCENT=10
     NEXT_PUBLIC_COMMISSION_DEPOSIT_PERCENT=40
     # server-only secrets (never prefixed with NEXT_PUBLIC_):
     SUPABASE_SERVICE_ROLE_KEY=
     RAZORPAY_KEY_SECRET=
     RAZORPAY_WEBHOOK_SECRET=
     PAYPAL_CLIENT_SECRET=
     RESEND_API_KEY=
     EXCHANGE_RATE_API_KEY=
   - Secrets are used ONLY in server-side code (Next.js API routes / server actions), never in client components.
   - A `config.ts` that reads these variables and exposes flags like `isSupabaseLive`, `isPaymentsLive`, `isEmailLive`.

3. Data layer abstraction:
   - All data access goes through one service layer (`services/auth`, `artworks`, `listings`, `orders`, `commissions`, `messages`, `notifications`, `storage`, `payments`, `admin`).
   - Each service has two implementations, `local` and `supabase`, with the SAME function names and return types. UI components never call Supabase or localStorage directly.

4. Ready-made database setup:
   - `supabase/schema.sql` creates ALL tables, relationships, indexes, enums for statuses, storage buckets, triggers (e.g. status-history logging) and RLS policies. It is pasted once into the Supabase SQL editor.
   - `supabase/seed.sql` contains the same sample data used in demo mode.
   - Next.js API routes for: creating Razorpay/PayPal orders, verifying payment signatures, payment webhooks, seller payouts, and sending emails.

5. Setup checker page:
   - A `/setup` page (open in demo mode, admin-only in live mode) with a checklist: Supabase connected ✅/❌, tables found ✅/❌, storage buckets ready ✅/❌, admin user exists ✅/❌, payments connected ✅/❌, email connected ✅/❌, plus clear fix instructions for anything missing.

====================================================================
## 11. Deploy on Vercel
====================================================================
- Works on Vercel with zero keys (demo mode).
- All keys come from Vercel Environment Variables.
- SEO: metadata, Open Graph images, sitemap.xml, robots.txt, clean URLs (/artwork/[slug], /artist/[username]).
- Optimised images (next/image + Supabase storage).

====================================================================
## 12. Testing
====================================================================
- Playwright E2E tests for the key flows: browse & buy, sell → admin approval → listing goes live, request changes → seller edits → re-approval, commission request with photo + sketch → quote → deposit.
- Vitest unit tests for the service layer (both local and supabase implementations share the same test suite where possible).
- Add data-testid attributes on key elements.

====================================================================
## 13. README (beginner-friendly)
====================================================================
- How to run locally in demo mode.
- Go live step by step: create a Supabase project → copy URL + anon key + service role key → run schema.sql (and optionally seed.sql) → add keys to `.env.local` → restart.
- Make yourself admin: give the one-line SQL command.
- Razorpay and PayPal: use test keys first, set up webhooks, then switch to live keys.
- Resend email setup and domain verification.
- Deploy to Vercel: push to GitHub → import in Vercel → paste env variables → deploy → add custom domain.
- How to run the tests.

====================================================================
## Output
====================================================================
Deliver the complete working app with the full folder structure. Build in this order: config + service layer + demo data → layout, navbar, footer and theme → shop and artwork pages → sell flow + admin approval → commission flow with sketch canvas → messages and notifications → payments → setup page, schema.sql, tests and README. The sketch canvas, commission flow and listing approval workflow are the heart of the site, so make sure they fully work.
