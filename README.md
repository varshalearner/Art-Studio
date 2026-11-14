# 🎨 Amber Easel Studio

A cozy online art studio & marketplace built with **Next.js + TypeScript**.
Anyone can **buy** original art, **sell** their own (after admin approval), and
**commission** custom paintings — with reference photos, a written brief, and a
built-in **sketch canvas** to doodle the idea.

> **It works right now with zero API keys.** Out of the box the app runs in
> **demo mode**: sample data in your browser's localStorage, mock login (with a
> one-click "Log in as Admin" button) and mock payments. Add real keys later
> and each service switches to live **independently, with no code changes**.

---

## ✨ What's inside

| Area | Highlights |
| --- | --- |
| Shop | Filters (category, medium, price, size, artist, ships-to-region), search, sorting, multi-currency prices, wishlist, reviews (only after purchase), watermarked previews, digital downloads |
| Sell | Seller dashboard (listings, orders to fulfil, commissions, earnings & payouts), upload form with per-region shipping rates |
| Approval workflow | Draft → Pending → Approved / Changes Requested / Rejected, admin notes shown to sellers, status timeline, **edits to live listings keep the old version live until re-approved**, enforced by Supabase RLS in live mode |
| Commissions | Photos + written brief + **sketch canvas** (brush, pencil, eraser, fill, undo/redo, draw on top of a photo, mouse/touch/stylus via perfect-freehand) → quote → deposit (default 40%) → WIP photos → final payment → delivery |
| Messages | Real-time chat per artwork/order/commission, image attachments, send a sketch from the canvas |
| Admin | Review queue with bulk approve, seller verification & suspension, orders & refunds, commission assignment, reports, full audit log |
| Global | English + Hindi (next-intl), INR/USD/EUR/GBP with daily-cached rates, local-time dates, GDPR cookie banner, dark "night studio" mode |
| Payments | Razorpay (cards/UPI) + PayPal, order creation, signature verification and webhooks in server-only API routes; mock gateway in demo mode |

---

## 🚀 Run locally (demo mode — no keys needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000. That's it.

**Demo logins** (on the Login page):

| Button | Who | Use it to… |
| --- | --- | --- |
| Log in as Buyer (Maya) | customer | buy art, request commissions, chat |
| Log in as Artist (Arjun) | seller | upload listings, send quotes, ship orders |
| Log in as Admin | studio admin | approve listings, manage users, view audit log |

Demo data lives in your browser's localStorage. To reset it, clear site data
(or run `localStorage.clear()` in the console) and reload.

---

## 🔌 Go live, step by step

Everything is controlled by environment variables — copy `.env.example` to
`.env.local` and fill in only what you have. Each service flips to live on its
own (e.g. real database with mock payments is fine).

### 1. Supabase (auth + database + storage + realtime)

1. Create a free project at [supabase.com](https://supabase.com).
2. Project Settings → **API**: copy the **URL**, **anon key** and
   **service_role key**.
3. Open the **SQL editor**, paste the whole of
   [`supabase/schema.sql`](supabase/schema.sql) and run it once.
   It creates all tables, enums, indexes, triggers, **Row Level Security
   policies** and the `artworks` storage bucket.
4. (Optional) run [`supabase/seed.sql`](supabase/seed.sql) for the sample
   artists & artworks.
5. Add to `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, keep secret
   ```

6. Restart `npm run dev`. Sign up in the app, then **make yourself admin**
   with this one line in the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

   (For Google login: Supabase Dashboard → Authentication → Providers →
   enable Google and paste your OAuth credentials.)

### 2. Razorpay (India + international cards + UPI)

1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → Account &
   Settings → API Keys → generate **test keys** first (`rzp_test_…`).
2. Add:

   ```env
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...            # server-only
   ```

3. Webhooks: Dashboard → Webhooks → Add
   `https://your-site.com/api/payments/razorpay/webhook`, select
   `payment.captured`, `payment.failed`, `refund.processed`, and set:

   ```env
   RAZORPAY_WEBHOOK_SECRET=...
   ```

4. Test a payment with Razorpay's test cards, then swap in live keys.

### 3. PayPal (international buyers)

1. [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials
   → create an app (sandbox first).
2. Add:

   ```env
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...           # server-only
   # PAYPAL_ENV=live                  # when you switch off sandbox
   ```

### 4. Resend (transactional email)

1. [resend.com](https://resend.com) → API Keys.
2. Verify your sending domain (Resend → Domains → add DNS records).
3. Add:

   ```env
   RESEND_API_KEY=re_...
   EMAIL_FROM="Amber Easel <hello@yourdomain.com>"
   ```

### 5. Exchange rates (optional)

Free key from [exchangerate-api.com](https://www.exchangerate-api.com):

```env
EXCHANGE_RATE_API_KEY=...
```

Rates are fetched with INR base and cached for 24 hours. Without a key the
app uses sensible built-in approximate rates.

### ✅ Check your setup

Open **`/setup`** — a live checklist shows Supabase connection, tables,
storage bucket, admin user, payments and email, with fix instructions for
anything missing. (Public in demo mode, admin-only in live mode.)

---

## ▲ Deploy to Vercel

1. Push the project to GitHub.
2. [vercel.com](https://vercel.com) → **Import** the repository (defaults are
   fine — Vercel detects Next.js).
3. Project → Settings → **Environment Variables** → paste the variables from
   your `.env.local` (or none at all for a demo-mode deployment!).
4. Deploy. Add your custom domain under Settings → Domains.
5. Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` so SEO tags, the
   sitemap and payment redirects use the right origin, and point the
   Razorpay/PayPal webhooks at that domain.

---

## 🧪 Tests

```bash
npm test              # Vitest unit tests for the service layer (24 tests)
npm run test:e2e      # Playwright end-to-end tests (demo mode)
```

The Playwright suite covers the key flows: **browse & buy**, **sell → admin
approval → live**, **request changes → edit → re-approval**, and **commission
with photo + sketch → quote → deposit**. First run:
`npx playwright install chromium`.

---

## 🗂 Project structure

```
src/
  config.ts               # env flags: isSupabaseLive, isPaymentsLive, …
  types.ts                # shared domain types
  services/               # ALL data access goes through here
    auth/ artworks/ listings/ orders/ commissions/
    messages/ notifications/ storage/ payments/ admin/
      local.ts            #   demo implementation (localStorage)
      supabase.ts         #   live implementation (same signatures)
      index.ts            #   picks one based on config
  lib/
    local/                # demo database + "realtime" events
    supabase/             # clients + row mappers
    demo-data.ts          # seeded sample data (mirrors supabase/seed.sql)
  components/             # UI (never touches Supabase/localStorage directly)
  app/                    # Next.js App Router pages + API routes
supabase/schema.sql       # one-paste database setup (tables, RLS, bucket)
supabase/seed.sql         # optional sample data
e2e/                      # Playwright tests
messages/en.json, hi.json # translations (add more locales here)
```

### Customising

- **Studio name & settings**: `NEXT_PUBLIC_SITE_NAME`,
  `NEXT_PUBLIC_PLATFORM_COMMISSION_PERCENT`,
  `NEXT_PUBLIC_COMMISSION_DEPOSIT_PERCENT` in `.env.local`.
- **Add a language**: copy `messages/en.json` → `messages/xx.json`, add the
  locale in `src/i18n/request.ts` and the switcher lists.
- **Demo artwork images**: regenerate with `npm run generate:art`.
- **Legal pages** are editable templates in `src/app/legal/` — review them
  with a lawyer before launch.

Analytics & monitoring: on Vercel, enable **Vercel Analytics** from the
dashboard; add **Sentry** with `npx @sentry/wizard@latest -i nextjs` when
you're ready for error tracking.
