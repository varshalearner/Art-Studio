-- ============================================================
-- Amber Easel Studio — optional sample data (same as demo mode)
-- Run AFTER schema.sql. Safe to re-run (idempotent-ish via fixed UUIDs).
--
-- NOTE: these artist profiles have no auth accounts (they're sample data,
-- nobody can log in as them). Your own account is created when you sign up
-- in the app; make it admin with:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================

-- ---------- sample artists ----------
insert into public.profiles (id, email, name, avatar_url, role, is_seller, seller_profile) values
('a0000000-0000-4000-8000-000000000001', 'arjun@demo.art', 'Arjun Mehta', '/avatars/avatar-1.svg', 'user', true,
 '{"displayName":"Arjun Mehta","username":"arjunmehta","bio":"Oil painter from Jaipur. I chase warm evening light — old havelis, chai stalls and quiet streets.","country":"India","avatarUrl":"/avatars/avatar-1.svg","payoutMethod":"UPI: demo@upi","verified":true,"suspended":false,"status":"approved","rating":4.8,"ratingCount":37,"createdAt":"2025-01-01T00:00:00Z"}'),
('a0000000-0000-4000-8000-000000000002', 'priya@demo.art', 'Priya Nair', '/avatars/avatar-2.svg', 'user', true,
 '{"displayName":"Priya Nair","username":"priyanair","bio":"Watercolor artist in Kochi painting monsoon skies, backwaters and everything green.","country":"India","avatarUrl":"/avatars/avatar-2.svg","payoutMethod":"UPI: demo@upi","verified":true,"suspended":false,"status":"approved","rating":4.9,"ratingCount":52,"createdAt":"2025-01-01T00:00:00Z"}'),
('a0000000-0000-4000-8000-000000000003', 'sofia@demo.art', 'Sofia Marchetti', '/avatars/avatar-3.svg', 'user', true,
 '{"displayName":"Sofia Marchetti","username":"sofiamarchetti","bio":"Florence-based illustrator mixing ink and digital. Portraits with a storybook soul.","country":"Italy","avatarUrl":"/avatars/avatar-3.svg","payoutMethod":"PayPal: demo@example.com","verified":true,"suspended":false,"status":"approved","rating":4.7,"ratingCount":24,"createdAt":"2025-02-01T00:00:00Z"}'),
('a0000000-0000-4000-8000-000000000004', 'kenji@demo.art', 'Kenji Watanabe', '/avatars/avatar-4.svg', 'user', true,
 '{"displayName":"Kenji Watanabe","username":"kenjiwatanabe","bio":"Minimal landscapes and still lifes from Kyoto. Acrylic, quiet colours, lots of negative space.","country":"Japan","avatarUrl":"/avatars/avatar-4.svg","payoutMethod":"Bank transfer","verified":false,"suspended":false,"status":"approved","rating":4.6,"ratingCount":18,"createdAt":"2025-03-01T00:00:00Z"}'),
('a0000000-0000-4000-8000-000000000005', 'elena@demo.art', 'Elena Volkova', '/avatars/avatar-5.svg', 'user', true,
 '{"displayName":"Elena Volkova","username":"elenavolkova","bio":"Charcoal and pencil artist. I draw people the way they look when nobody is watching.","country":"Germany","avatarUrl":"/avatars/avatar-5.svg","payoutMethod":"PayPal: demo@example.com","verified":true,"suspended":false,"status":"approved","rating":4.9,"ratingCount":41,"createdAt":"2025-01-15T00:00:00Z"}'),
('a0000000-0000-4000-8000-000000000006', 'david@demo.art', 'David Osei', '/avatars/avatar-6.svg', 'user', true,
 '{"displayName":"David Osei","username":"davidosei","bio":"Abstract painter from Accra — bold shapes, market colours, rhythm on canvas.","country":"Ghana","avatarUrl":"/avatars/avatar-6.svg","payoutMethod":"Bank transfer","verified":false,"suspended":false,"status":"approved","rating":4.5,"ratingCount":9,"createdAt":"2025-06-01T00:00:00Z"}')
on conflict (id) do nothing;

-- ---------- sample listings ----------
-- images point at the SVGs bundled in /public of the deployed app.
insert into public.listings
(id, slug, seller_id, title, description, category, medium, width_cm, height_cm, price_inr, kind, images, full_res_url, status, status_history, ships_to, shipping_rates, stock, featured, rating_avg, rating_count) values
('b0000000-0000-4000-8000-000000000001','market-morning','a0000000-0000-4000-8000-000000000006','Market Morning','Bold abstract shapes inspired by the morning rush of Makola market — terracotta stalls, mustard sunlight and the hum of a city waking up.','abstract','acrylic',60,75,18500,'physical','["/art/art-01.svg"]','/art/art-01.svg','approved','[{"status":"approved","at":"2025-08-20T00:00:00Z"}]','["india","asia","europe","north_america","rest_of_world"]','[{"region":"india","rateInr":150},{"region":"asia","rateInr":1200},{"region":"europe","rateInr":2000},{"region":"north_america","rateInr":2200},{"region":"rest_of_world","rateInr":2500}]',1,true,4.7,6),
('b0000000-0000-4000-8000-000000000002','monsoon-over-the-backwaters','a0000000-0000-4000-8000-000000000002','Monsoon over the Backwaters','A watercolor of the first monsoon clouds rolling over Kerala''s backwaters.','landscape','watercolor',36,48,9200,'physical','["/art/art-02.svg"]','/art/art-02.svg','approved','[{"status":"approved","at":"2025-08-28T00:00:00Z"}]','["india","asia","europe","north_america","rest_of_world"]','[{"region":"india","rateInr":150},{"region":"asia","rateInr":1200},{"region":"europe","rateInr":2000},{"region":"north_america","rateInr":2200},{"region":"rest_of_world","rateInr":2500}]',1,true,4.9,11),
('b0000000-0000-4000-8000-000000000003','the-letter-she-never-sent','a0000000-0000-4000-8000-000000000003','The Letter She Never Sent','Ink and digital portrait of a woman caught mid-thought. Part of my ''Quiet Stories'' series.','portrait','digital',30,40,6500,'digital','["/art/art-03.svg"]','/art/art-03.svg','approved','[{"status":"approved","at":"2025-09-05T00:00:00Z"}]','[]','[]',999,true,4.8,9),
('b0000000-0000-4000-8000-000000000005','haveli-at-dusk','a0000000-0000-4000-8000-000000000001','Haveli at Dusk','Oil painting of a crumbling Jaipur haveli as the streetlamps flicker on. Thick impasto skies in terracotta and deep amber.','painting','oil',61,76,24500,'physical','["/art/art-05.svg"]','/art/art-05.svg','approved','[{"status":"approved","at":"2025-09-15T00:00:00Z"}]','["india","asia","europe","north_america","rest_of_world"]','[{"region":"india","rateInr":150},{"region":"asia","rateInr":1200},{"region":"europe","rateInr":2000},{"region":"north_america","rateInr":2200},{"region":"rest_of_world","rateInr":2500}]',1,true,4.9,14),
('b0000000-0000-4000-8000-000000000006','study-of-hands-iii','a0000000-0000-4000-8000-000000000005','Study of Hands III','Charcoal study of my grandmother''s hands, resting after kneading dough.','sketch','charcoal',28,36,5400,'physical','["/art/art-06.svg"]','/art/art-06.svg','approved','[{"status":"approved","at":"2025-09-20T00:00:00Z"}]','["india","europe","north_america"]','[{"region":"india","rateInr":150},{"region":"europe","rateInr":2000},{"region":"north_america","rateInr":2200}]',1,false,5,8),
('b0000000-0000-4000-8000-000000000013','blue-door-old-city','a0000000-0000-4000-8000-000000000001','Blue Door, Old City','A weathered indigo door in Jaipur''s old quarter, framed by terracotta walls.','painting','oil',30,40,9800,'physical','["/art/art-13.svg"]','/art/art-13.svg','pending','[{"status":"pending","at":"2025-11-12T00:00:00Z"}]','["india","asia","europe"]','[{"region":"india","rateInr":150},{"region":"asia","rateInr":1200},{"region":"europe","rateInr":2000}]',1,false,0,0),
('b0000000-0000-4000-8000-000000000015','bamboo-after-rain','a0000000-0000-4000-8000-000000000004','Bamboo After Rain','Ink study of bamboo, still dripping.','sketch','ink',26,36,5200,'physical','["/art/art-15.svg"]','/art/art-15.svg','changes_requested','[{"status":"changes_requested","at":"2025-11-10T00:00:00Z","note":"Please add a photo in natural light."}]','["india","asia"]','[{"region":"india","rateInr":150},{"region":"asia","rateInr":1200}]',1,false,0,0)
on conflict (id) do nothing;

update public.listings set admin_note = 'Lovely work! Please add a photo of the artwork in natural light and mention whether it ships framed or unframed.'
where id = 'b0000000-0000-4000-8000-000000000015';

-- Add more rows following the same pattern if you want the full demo catalog.
