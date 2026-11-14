-- ============================================================
-- Amber Easel Studio — full database setup
-- Paste this ONCE into the Supabase SQL editor and run it.
-- Creates: enums, tables, indexes, triggers, RLS policies and
-- the 'artworks' storage bucket.
-- ============================================================

-- ---------- extensions ----------
create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type listing_status as enum
    ('draft','pending','approved','changes_requested','rejected','sold','paused','removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum
    ('placed','paid','shipped','delivered','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commission_status as enum
    ('submitted','quote_sent','accepted','deposit_paid','in_progress','ready','final_paid','delivered','declined','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open','resolved','dismissed');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
-- One row per user. Linked to auth.users by id via trigger (below), but the
-- FK is intentionally omitted so seed.sql can insert sample artists that
-- have no auth account.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text not null default '',
  avatar_url text not null default '',
  role text not null default 'user' check (role in ('user','admin')),
  is_seller boolean not null default false,
  seller_profile jsonb,            -- { displayName, username, bio, country, avatarUrl, payoutMethod, verified, suspended, status, rating, ratingCount, createdAt }
  language text not null default 'en',
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

-- auto-create a profile when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is the current user an admin? (used by RLS everywhere)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- listings ----------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'painting',
  medium text not null default 'oil',
  width_cm numeric not null default 0,
  height_cm numeric not null default 0,
  price_inr numeric not null check (price_inr >= 0),
  kind text not null default 'physical' check (kind in ('physical','digital')),
  images jsonb not null default '[]',
  full_res_url text,
  status listing_status not null default 'draft',
  admin_note text,
  status_history jsonb not null default '[]',
  ships_to jsonb not null default '[]',
  shipping_rates jsonb not null default '[]',
  stock integer not null default 1,
  featured boolean not null default false,
  pending_edit jsonb,
  rating_avg numeric not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_price_idx on public.listings (price_inr);
create index if not exists listings_created_idx on public.listings (created_at desc);

-- keep updated_at fresh + log status changes into status_history automatically
create or replace function public.touch_listing()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- safety net: ensure every status change lands in the history even if
    -- the app forgot to append it
    if (new.status_history = old.status_history) then
      new.status_history = old.status_history ||
        jsonb_build_array(jsonb_build_object('status', new.status, 'at', now()));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists listings_touch on public.listings;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_listing();

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  items jsonb not null default '[]',        -- [{listingId, sellerId, title, image, kind, priceInr, qty, downloadUrl}]
  seller_ids uuid[] not null default '{}',  -- maintained by trigger, used for RLS
  shipping_address jsonb,
  shipping_inr numeric not null default 0,
  subtotal_inr numeric not null default 0,
  total_inr numeric not null default 0,
  display_currency text not null default 'INR',
  display_total numeric not null default 0,
  commission_percent numeric not null default 10,
  status order_status not null default 'placed',
  tracking_number text,
  payment_provider text not null default 'demo',
  payment_id text,
  timeline jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists orders_buyer_idx on public.orders (buyer_id);
create index if not exists orders_seller_ids_idx on public.orders using gin (seller_ids);
create index if not exists orders_payment_idx on public.orders (payment_id);

create or replace function public.orders_fill_seller_ids()
returns trigger language plpgsql as $$
begin
  select coalesce(array_agg(distinct (item->>'sellerId')::uuid), '{}')
    into new.seller_ids
    from jsonb_array_elements(new.items) as item;
  return new;
end $$;

drop trigger if exists orders_seller_ids on public.orders;
create trigger orders_seller_ids before insert or update of items on public.orders
  for each row execute function public.orders_fill_seller_ids();

-- ---------- commissions ----------
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null default '',
  medium text not null default 'oil',
  size text not null default '',
  style text not null default '',
  budget_min_inr numeric not null default 0,
  budget_max_inr numeric not null default 0,
  deadline timestamptz,
  reference_images jsonb not null default '[]',
  sketch_image text,
  status commission_status not null default 'submitted',
  quote_inr numeric,
  quote_note text,
  deposit_percent numeric not null default 40,
  deposit_paid_inr numeric,
  final_paid_inr numeric,
  wip_images jsonb not null default '[]',
  timeline jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists commissions_buyer_idx on public.commissions (buyer_id);
create index if not exists commissions_artist_idx on public.commissions (artist_id);
create index if not exists commissions_status_idx on public.commissions (status);

-- ---------- chat ----------
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  participant_ids uuid[] not null,
  participant_names jsonb not null default '{}',
  context jsonb not null default '{"type":"general","id":""}',
  context_label text not null default '',
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  unread_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists threads_participants_idx on public.threads using gin (participant_ids);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null default '',
  text text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null default '',
  href text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  order_id uuid not null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  buyer_name text not null default '',
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

-- reviews allowed only after a completed purchase of that artwork (enforced in DB)
create or replace function public.review_requires_purchase()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.orders o
    where o.id = new.order_id
      and o.buyer_id = new.buyer_id
      and o.status in ('paid','shipped','delivered')
      and exists (
        select 1 from jsonb_array_elements(o.items) item
        where (item->>'listingId')::uuid = new.listing_id
      )
  ) then
    raise exception 'Reviews are only allowed after a completed purchase of this artwork';
  end if;
  return new;
end $$;

drop trigger if exists reviews_purchase_check on public.reviews;
create trigger reviews_purchase_check before insert on public.reviews
  for each row execute function public.review_requires_purchase();

-- keep listing rating aggregates fresh
create or replace function public.refresh_listing_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  target := coalesce(new.listing_id, old.listing_id);
  update public.listings l set
    rating_avg = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where listing_id = target), 0),
    rating_count = (select count(*) from public.reviews where listing_id = target)
  where l.id = target;
  return null;
end $$;

drop trigger if exists reviews_aggregate on public.reviews;
create trigger reviews_aggregate after insert or update or delete on public.reviews
  for each row execute function public.refresh_listing_rating();

-- ---------- reports / audit / wishlists / payment events ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null default 'listing',
  target_id uuid not null,
  target_label text not null default '',
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  admin_name text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- Only APPROVED listings are publicly visible — enforced here,
-- not just in the UI.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.commissions enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.wishlists enable row level security;
alter table public.payment_events enable row level security;

-- profiles: everyone can read (public artist pages); users edit themselves;
-- role changes only via SQL / service role (column protected by trigger below)
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles for insert
  with check (auth.uid() = id or public.is_admin());

-- the admin role can never be set from the client API
create or replace function public.protect_admin_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() and auth.uid() is not null then
    raise exception 'Role can only be changed by an admin (or via SQL)';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_admin_role();

-- listings
drop policy if exists "listings public read approved" on public.listings;
create policy "listings public read approved" on public.listings for select
  using (status = 'approved' or seller_id = auth.uid() or public.is_admin());

drop policy if exists "listings seller insert" on public.listings;
create policy "listings seller insert" on public.listings for insert
  with check (
    seller_id = auth.uid()
    and status in ('draft','pending')
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_seller
                and coalesce((p.seller_profile->>'suspended')::boolean, false) = false)
  );

drop policy if exists "listings seller update" on public.listings;
create policy "listings seller update" on public.listings for update
  using (seller_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      seller_id = auth.uid()
      -- sellers can never set their own listing to approved
      and status in ('draft','pending','paused','approved','sold')
    )
  );

drop policy if exists "listings admin delete" on public.listings;
create policy "listings admin delete" on public.listings for delete
  using (public.is_admin() or (seller_id = auth.uid() and status in ('draft','rejected')));

-- extra guard: a seller cannot transition a listing INTO 'approved'
create or replace function public.protect_listing_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status not in ('approved','paused','sold')
     and not public.is_admin() and auth.uid() is not null then
    raise exception 'Only the studio admin can approve listings';
  end if;
  return new;
end $$;

drop trigger if exists listings_protect_approval on public.listings;
create trigger listings_protect_approval before update on public.listings
  for each row execute function public.protect_listing_approval();

-- orders: buyer, the sellers involved, and admin
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select
  using (buyer_id = auth.uid() or auth.uid() = any (seller_ids) or public.is_admin());

drop policy if exists "orders insert" on public.orders;
create policy "orders insert" on public.orders for insert
  with check (buyer_id = auth.uid());

drop policy if exists "orders update" on public.orders;
create policy "orders update" on public.orders for update
  using (buyer_id = auth.uid() or auth.uid() = any (seller_ids) or public.is_admin());

-- commissions: buyer, assigned artist, admin
drop policy if exists "commissions read" on public.commissions;
create policy "commissions read" on public.commissions for select
  using (buyer_id = auth.uid() or artist_id = auth.uid() or public.is_admin());

drop policy if exists "commissions insert" on public.commissions;
create policy "commissions insert" on public.commissions for insert
  with check (buyer_id = auth.uid());

drop policy if exists "commissions update" on public.commissions;
create policy "commissions update" on public.commissions for update
  using (buyer_id = auth.uid() or artist_id = auth.uid() or public.is_admin());

-- threads & messages: participants only
drop policy if exists "threads read" on public.threads;
create policy "threads read" on public.threads for select
  using (auth.uid() = any (participant_ids) or public.is_admin());

drop policy if exists "threads insert" on public.threads;
create policy "threads insert" on public.threads for insert
  with check (auth.uid() = any (participant_ids));

drop policy if exists "threads update" on public.threads;
create policy "threads update" on public.threads for update
  using (auth.uid() = any (participant_ids));

drop policy if exists "messages read" on public.messages;
create policy "messages read" on public.messages for select
  using (exists (
    select 1 from public.threads t
    where t.id = thread_id and (auth.uid() = any (t.participant_ids) or public.is_admin())
  ));

drop policy if exists "messages insert" on public.messages;
create policy "messages insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.threads t
      where t.id = thread_id and auth.uid() = any (t.participant_ids)
    )
  );

-- chat replies + reactions (also in supabase/migrations/chat-reactions.sql)
alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;
alter table public.messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

-- One reaction per person per message. Participants may only change their own
-- reaction (never the message text), so this goes through a function instead
-- of a general UPDATE policy on messages.
create or replace function public.react_to_message(p_message_id uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  if p_emoji is not null and char_length(p_emoji) > 16 then
    raise exception 'Invalid reaction';
  end if;
  if not exists (
    select 1 from public.messages m
    join public.threads t on t.id = m.thread_id
    where m.id = p_message_id and v_uid = any (t.participant_ids)
  ) then
    raise exception 'Not allowed';
  end if;
  if p_emoji is null or p_emoji = '' then
    update public.messages set reactions = reactions - v_uid::text where id = p_message_id;
  else
    update public.messages
      set reactions = jsonb_set(reactions, array[v_uid::text], to_jsonb(p_emoji), true)
      where id = p_message_id;
  end if;
end $$;

revoke all on function public.react_to_message(uuid, text) from public, anon;
grant execute on function public.react_to_message(uuid, text) to authenticated;

-- notifications: owner only (insert allowed for any logged-in user so that
-- buyer/seller actions can notify the counterparty)
drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert" on public.notifications for insert
  with check (auth.uid() is not null);

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications for update
  using (user_id = auth.uid());

-- reviews: public read; buyers insert their own (trigger checks purchase)
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (true);

drop policy if exists "reviews insert" on public.reviews;
create policy "reviews insert" on public.reviews for insert
  with check (buyer_id = auth.uid());

-- reports: any logged-in user may report; admins manage
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "reports admin read" on public.reports;
create policy "reports admin read" on public.reports for select using (public.is_admin());

drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update" on public.reports for update using (public.is_admin());

-- audit log: admin only
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select using (public.is_admin());

drop policy if exists "audit admin insert" on public.audit_log;
create policy "audit admin insert" on public.audit_log for insert with check (public.is_admin());

-- wishlists: owner only
drop policy if exists "wishlists all own" on public.wishlists;
create policy "wishlists all own" on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- payment events: service role only (no client policies at all)

-- ============================================================
-- Storage: public 'artworks' bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do nothing;

drop policy if exists "artworks public read" on storage.objects;
create policy "artworks public read" on storage.objects for select
  using (bucket_id = 'artworks');

drop policy if exists "artworks authenticated upload" on storage.objects;
create policy "artworks authenticated upload" on storage.objects for insert
  with check (bucket_id = 'artworks' and auth.uid() is not null);

drop policy if exists "artworks owner delete" on storage.objects;
create policy "artworks owner delete" on storage.objects for delete
  using (bucket_id = 'artworks' and (owner = auth.uid() or public.is_admin()));

-- ============================================================
-- Realtime
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.listings;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.commissions;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.threads;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- ============================================================
-- Done! To make yourself admin after signing up in the app:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================
